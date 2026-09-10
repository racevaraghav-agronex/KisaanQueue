import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// In-memory collections map: CollectionName -> Map<id, doc>
const collections = new Map<string, Map<string, any>>();

function getCollection(name: string): Map<string, any> {
  let col = collections.get(name);
  if (!col) {
    col = new Map<string, any>();
    collections.set(name, col);
  }
  return col;
}

function generateId(): string {
  try {
    return new mongoose.Types.ObjectId().toString();
  } catch {
    return Math.random().toString(16).substring(2, 10) +
           Math.random().toString(16).substring(2, 10) +
           Math.random().toString(16).substring(2, 10);
  }
}

// Deep clone helper
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (Array.isArray(obj)) return obj.map(deepClone) as any;
  const clone: any = {};
  for (const key of Object.keys(obj as any)) {
    clone[key] = deepClone((obj as any)[key]);
  }
  return clone;
}

// Wrap doc with mongoose-like document methods (.save, .toObject, .toJSON)
export function wrapDocument(data: any, collectionName: string) {
  if (!data) return null;
  const col = getCollection(collectionName);
  const docId = data._id ? String(data._id) : generateId();

  const doc = {
    ...data,
    _id: docId,
    id: docId,
    save: async function () {
      this.updatedAt = new Date();
      const plain = { ...this };
      delete plain.save;
      delete plain.toObject;
      delete plain.toJSON;
      col.set(this._id, plain);
      return this;
    },
    toObject: function () {
      const plain = { ...this };
      delete plain.save;
      delete plain.toObject;
      delete plain.toJSON;
      return deepClone(plain);
    },
    toJSON: function () {
      return this.toObject();
    }
  };

  return doc;
}

// Helper to check if a value matches filter condition
function matchesCondition(docVal: any, condVal: any): boolean {
  if (condVal === null || condVal === undefined) {
    return docVal === null || docVal === undefined;
  }

  // Handle Regex
  if (condVal instanceof RegExp) {
    return condVal.test(String(docVal ?? ''));
  }

  // Handle object condition (operators like $ne, $in, $gte, $regex)
  if (typeof condVal === 'object' && !Array.isArray(condVal) && !(condVal instanceof Date)) {
    const keys = Object.keys(condVal);
    const hasOperators = keys.some(k => k.startsWith('$'));

    if (hasOperators) {
      for (const op of keys) {
        const val = condVal[op];
        if (op === '$ne') {
          if (String(docVal) === String(val)) return false;
        } else if (op === '$eq') {
          if (String(docVal) !== String(val)) return false;
        } else if (op === '$in') {
          if (!Array.isArray(val)) return false;
          const matchAny = val.some(v => String(v) === String(docVal));
          if (!matchAny) return false;
        } else if (op === '$nin') {
          if (Array.isArray(val) && val.some(v => String(v) === String(docVal))) return false;
        } else if (op === '$regex') {
          const rx = new RegExp(val, condVal.$options || '');
          if (!rx.test(String(docVal ?? ''))) return false;
        } else if (op === '$gt') {
          const dVal = docVal instanceof Date ? docVal.getTime() : Number(docVal);
          const cVal = val instanceof Date ? val.getTime() : Number(val);
          if (!(dVal > cVal)) return false;
        } else if (op === '$gte') {
          const dVal = docVal instanceof Date ? docVal.getTime() : Number(docVal);
          const cVal = val instanceof Date ? val.getTime() : Number(val);
          if (!(dVal >= cVal)) return false;
        } else if (op === '$lt') {
          const dVal = docVal instanceof Date ? docVal.getTime() : Number(docVal);
          const cVal = val instanceof Date ? val.getTime() : Number(val);
          if (!(dVal < cVal)) return false;
        } else if (op === '$lte') {
          const dVal = docVal instanceof Date ? docVal.getTime() : Number(docVal);
          const cVal = val instanceof Date ? val.getTime() : Number(val);
          if (!(dVal <= cVal)) return false;
        } else if (op === '$exists') {
          const exists = docVal !== undefined && docVal !== null;
          if (exists !== Boolean(val)) return false;
        }
      }
      return true;
    }
  }

  // Exact match (support ObjectId vs String comparison)
  if (docVal instanceof Date && condVal instanceof Date) {
    return docVal.getTime() === condVal.getTime();
  }

  return String(docVal) === String(condVal) || docVal === condVal;
}

// Check if document matches a query filter
function matchFilter(doc: any, filter?: any): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;

  if (Array.isArray(filter.$or)) {
    const orMatches = filter.$or.some((subFilter: any) => matchFilter(doc, subFilter));
    if (!orMatches) return false;
  }

  if (Array.isArray(filter.$and)) {
    const andMatches = filter.$and.every((subFilter: any) => matchFilter(doc, subFilter));
    if (!andMatches) return false;
  }

  for (const [key, cond] of Object.entries(filter)) {
    if (key === '$or' || key === '$and') continue;

    let docVal = doc[key];
    // Support dot notation: e.g. "a.b"
    if (key.includes('.')) {
      const parts = key.split('.');
      let curr = doc;
      for (const p of parts) {
        if (curr && typeof curr === 'object') {
          curr = curr[p];
        } else {
          curr = undefined;
          break;
        }
      }
      docVal = curr;
    }

    if (!matchesCondition(docVal, cond)) {
      return false;
    }
  }

  return true;
}

// Apply update operations ($set, $inc, direct properties)
function applyUpdate(target: any, update: any) {
  if (!update) return target;

  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set)) {
      target[k] = deepClone(v);
    }
  }

  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc)) {
      target[k] = (Number(target[k]) || 0) + Number(v);
    }
  }

  if (update.$push) {
    for (const [k, v] of Object.entries(update.$push)) {
      if (!Array.isArray(target[k])) target[k] = [];
      target[k].push(deepClone(v));
    }
  }

  // Direct fields (not starting with $)
  for (const [k, v] of Object.entries(update)) {
    if (!k.startsWith('$')) {
      target[k] = deepClone(v);
    }
  }

  target.updatedAt = new Date();
  return target;
}

// Query builder to support chaining: .sort(), .limit(), .skip(), .lean(), .select(), .populate()
class MemoryQuery<T> implements PromiseLike<T> {
  private collectionName: string;
  private filter?: any;
  private isSingle: boolean;
  private sortObj?: Record<string, number>;
  private limitCount?: number;
  private skipCount?: number;

  constructor(collectionName: string, filter: any, isSingle: boolean) {
    this.collectionName = collectionName;
    this.filter = filter;
    this.isSingle = isSingle;
  }

  sort(sortObj: any) {
    if (typeof sortObj === 'string') {
      const parts = sortObj.split(' ');
      const obj: Record<string, number> = {};
      for (const p of parts) {
        if (p.startsWith('-')) obj[p.substring(1)] = -1;
        else if (p) obj[p] = 1;
      }
      this.sortObj = obj;
    } else if (sortObj && typeof sortObj === 'object') {
      this.sortObj = sortObj;
    }
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  skip(n: number) {
    this.skipCount = n;
    return this;
  }

  lean() {
    return this;
  }

  select(_fields: any) {
    return this;
  }

  populate(_fields: any) {
    return this;
  }

  async exec(): Promise<T> {
    const col = getCollection(this.collectionName);
    const all = Array.from(col.values());

    let results = all.filter(doc => matchFilter(doc, this.filter));

    if (this.sortObj) {
      const sortKeys = Object.entries(this.sortObj);
      results.sort((a, b) => {
        for (const [key, dir] of sortKeys) {
          const valA = a[key];
          const valB = b[key];
          if (valA === valB) continue;
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;
          return valA > valB ? dir : -dir;
        }
        return 0;
      });
    }

    if (this.skipCount && this.skipCount > 0) {
      results = results.slice(this.skipCount);
    }

    if (this.limitCount !== undefined && this.limitCount > 0) {
      results = results.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      const first = results[0];
      return (first ? wrapDocument(deepClone(first), this.collectionName) : null) as any;
    }

    return results.map(doc => wrapDocument(deepClone(doc), this.collectionName)) as any;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

// Memory database operations exposed to models
export const memoryDb = {
  create: async function (collectionName: string, data: any) {
    const col = getCollection(collectionName);
    const id = data._id ? String(data._id) : generateId();
    const now = new Date();
    const record = {
      ...deepClone(data),
      _id: id,
      id,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    };
    col.set(id, record);
    return wrapDocument(deepClone(record), collectionName);
  },

  insertMany: async function (collectionName: string, items: any[]) {
    const col = getCollection(collectionName);
    const created: any[] = [];
    const now = new Date();
    for (const item of items) {
      const id = item._id ? String(item._id) : generateId();
      const record = {
        ...deepClone(item),
        _id: id,
        id,
        createdAt: item.createdAt || now,
        updatedAt: item.updatedAt || now
      };
      col.set(id, record);
      created.push(wrapDocument(deepClone(record), collectionName));
    }
    return created;
  },

  find: function (collectionName: string, filter: any = {}) {
    return new MemoryQuery<any[]>(collectionName, filter, false);
  },

  findOne: function (collectionName: string, filter: any = {}) {
    return new MemoryQuery<any>(collectionName, filter, true);
  },

  findById: function (collectionName: string, id: any) {
    return new MemoryQuery<any>(collectionName, { _id: id ? String(id) : '' }, true);
  },

  findByIdAndUpdate: async function (collectionName: string, id: any, update: any, options: any = {}) {
    const col = getCollection(collectionName);
    const strId = id ? String(id) : '';
    const existing = col.get(strId);
    if (!existing) return null;

    const oldRecord = deepClone(existing);
    applyUpdate(existing, update);
    col.set(strId, existing);

    const docToReturn = options.new !== false ? existing : oldRecord;
    return wrapDocument(deepClone(docToReturn), collectionName);
  },

  findOneAndUpdate: async function (collectionName: string, filter: any, update: any, options: any = {}) {
    const col = getCollection(collectionName);
    const all = Array.from(col.values());
    const matched = all.find(d => matchFilter(d, filter));

    if (!matched) {
      if (options.upsert) {
        const newRecord = { ...deepClone(filter), _id: generateId() };
        applyUpdate(newRecord, update);
        col.set(newRecord._id, newRecord);
        return wrapDocument(deepClone(newRecord), collectionName);
      }
      return null;
    }

    const oldRecord = deepClone(matched);
    applyUpdate(matched, update);
    col.set(matched._id, matched);

    const docToReturn = options.new !== false ? matched : oldRecord;
    return wrapDocument(deepClone(docToReturn), collectionName);
  },

  countDocuments: async function (collectionName: string, filter: any = {}) {
    const col = getCollection(collectionName);
    const all = Array.from(col.values());
    return all.filter(doc => matchFilter(doc, filter)).length;
  },

  updateMany: async function (collectionName: string, filter: any, update: any) {
    const col = getCollection(collectionName);
    const all = Array.from(col.values());
    let modifiedCount = 0;
    for (const doc of all) {
      if (matchFilter(doc, filter)) {
        applyUpdate(doc, update);
        col.set(doc._id, doc);
        modifiedCount++;
      }
    }
    return { acknowledged: true, modifiedCount, matchedCount: modifiedCount };
  },

  deleteOne: async function (collectionName: string, filter: any) {
    const col = getCollection(collectionName);
    const all = Array.from(col.entries());
    for (const [id, doc] of all) {
      if (matchFilter(doc, filter)) {
        col.delete(id);
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  },

  deleteMany: async function (collectionName: string, filter: any) {
    const col = getCollection(collectionName);
    const all = Array.from(col.entries());
    let deletedCount = 0;
    for (const [id, doc] of all) {
      if (matchFilter(doc, filter)) {
        col.delete(id);
        deletedCount++;
      }
    }
    return { deletedCount };
  },

  findByIdAndDelete: async function (collectionName: string, id: any) {
    const col = getCollection(collectionName);
    const strId = id ? String(id) : '';
    const existing = col.get(strId);
    if (existing) {
      col.delete(strId);
      return wrapDocument(deepClone(existing), collectionName);
    }
    return null;
  },

  aggregate: async function (collectionName: string, pipeline: any[] = []) {
    const col = getCollection(collectionName);
    let results = deepClone(Array.from(col.values()));

    for (const stage of pipeline) {
      if (stage.$match) {
        results = results.filter(doc => matchFilter(doc, stage.$match));
      } else if (stage.$group) {
        const groupSpec = stage.$group;
        const idField = groupSpec._id;
        const groups = new Map<any, any>();

        for (const doc of results) {
          let groupId: any = null;
          if (typeof idField === 'string' && idField.startsWith('$')) {
            groupId = doc[idField.substring(1)];
          } else {
            groupId = idField;
          }

          if (!groups.has(groupId)) {
            const initial: any = { _id: groupId };
            for (const [key, spec] of Object.entries(groupSpec)) {
              if (key === '_id') continue;
              if ((spec as any).$sum !== undefined) initial[key] = 0;
              else if ((spec as any).$count !== undefined) initial[key] = 0;
            }
            groups.set(groupId, initial);
          }

          const current = groups.get(groupId);
          for (const [key, spec] of Object.entries(groupSpec)) {
            if (key === '_id') continue;
            const sumVal = (spec as any).$sum;
            if (sumVal === 1) {
              current[key] = (current[key] || 0) + 1;
            } else if (typeof sumVal === 'string' && sumVal.startsWith('$')) {
              const num = Number(doc[sumVal.substring(1)]) || 0;
              current[key] = (current[key] || 0) + num;
            } else if (typeof sumVal === 'number') {
              current[key] = (current[key] || 0) + sumVal;
            }
          }
        }

        results = Array.from(groups.values());
      } else if (stage.$sort) {
        const sortKeys = Object.entries(stage.$sort);
        results.sort((a, b) => {
          for (const [key, dir] of sortKeys) {
            const valA = a[key];
            const valB = b[key];
            if (valA === valB) continue;
            if (valA === undefined || valA === null) return 1;
            if (valB === undefined || valB === null) return -1;
            return valA > valB ? Number(dir) : -Number(dir);
          }
          return 0;
        });
      } else if (stage.$limit) {
        results = results.slice(0, stage.$limit);
      }
    }

    return results;
  }
};

/**
 * Creates a Model wrapper that delegates to real Mongoose when connected,
 * or to the in-memory database store when offline.
 */
export function wrapModel<T = any>(modelName: string, mongooseModel: any): any {
  return new Proxy(mongooseModel, {
    get(target, prop: string | symbol) {
      // If Mongoose is connected to a real MongoDB server, prefer real Mongoose
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const val = (target as any)[prop];
        if (typeof val === 'function') {
          return val.bind(target);
        }
        return val;
      }

      // Offline / In-Memory fallback methods
      if (prop === 'find') {
        return (filter?: any) => memoryDb.find(modelName, filter);
      }
      if (prop === 'findOne') {
        return (filter?: any) => memoryDb.findOne(modelName, filter);
      }
      if (prop === 'findById') {
        return (id: any) => memoryDb.findById(modelName, id);
      }
      if (prop === 'create') {
        return (data: any) => {
          if (Array.isArray(data)) {
            return memoryDb.insertMany(modelName, data);
          }
          return memoryDb.create(modelName, data);
        };
      }
      if (prop === 'insertMany') {
        return (items: any[]) => memoryDb.insertMany(modelName, items);
      }
      if (prop === 'findByIdAndUpdate') {
        return (id: any, update: any, options?: any) => memoryDb.findByIdAndUpdate(modelName, id, update, options);
      }
      if (prop === 'findOneAndUpdate') {
        return (filter: any, update: any, options?: any) => memoryDb.findOneAndUpdate(modelName, filter, update, options);
      }
      if (prop === 'countDocuments') {
        return (filter?: any) => memoryDb.countDocuments(modelName, filter);
      }
      if (prop === 'updateMany') {
        return (filter: any, update: any) => memoryDb.updateMany(modelName, filter, update);
      }
      if (prop === 'deleteOne') {
        return (filter: any) => memoryDb.deleteOne(modelName, filter);
      }
      if (prop === 'deleteMany') {
        return (filter: any) => memoryDb.deleteMany(modelName, filter);
      }
      if (prop === 'findByIdAndDelete') {
        return (id: any) => memoryDb.findByIdAndDelete(modelName, id);
      }
      if (prop === 'aggregate') {
        return (pipeline: any[]) => memoryDb.aggregate(modelName, pipeline);
      }

      // Default to target property
      const targetVal = (target as any)[prop];
      if (typeof targetVal === 'function') {
        return targetVal.bind(target);
      }
      return targetVal;
    }
  });
}
