/**
 * REQUIRES ECMA Script 5 Features
 */


function Territory(objOrNumber, name, typeId, opt_arrRecords, opt_updatedOn) {
  if ('object' == typeof objOrNumber) {
    name = objOrNumber.name;
    typeId = objOrNumber.typeId;
    records = objOrNumber.records;
    updatedOn = objOrNumber.updatedOn;
    objOrNumber = objOrNumber.number;
  }
  if (!Territory.TYPE_IDS.contains(typeId)) {
    throw new Error('Cannot create a territory of type ID "' + typeId + '".');
  }
  var RecordType = Territory.RECORD_TYPES_BY_ID[typeId];
  var obj = {
    number: objOrNumber,
    name: name,
    records: (opt_arrRecords || []).map(function(record) {
      return new RecordType(record);
    }),
    updatedOn: opt_updatedOn || +new Date,
    updateCallbacks: [],
    typeId: typeId
  };
  this._ = obj;
}
Territory.prototype = {
  constructor: Territory,
  _triggerUpdate: function(data) {
    var me = this;
    data.timeStamp = me._.updatedOn = +new Date;
    me._.updateCallbacks.forEach(function(callback) {
      try {
        callback.call(me, data);
      }
      catch (e) {
        setTimeout(function(){throw e}, 0);
      }
    });
  },
  bindToUpdate: function(callback) {
    var _ = this._;
    _.updateCallbacks.push(callback);
  },
  getName: function() {
    return this._.name;
  },
  setName: function(name) {
    this._.name = name;
    this._triggerUpdate({action:'setName'});
    return this;
  },
  getNumber: function() {
    return this._.number;
  },
  setNumber: function(number) {
    this._.number = number;
    this._triggerUpdate({action:'setNumber'});
    return this;
  },
  getTypeId: function() {
    return this._.typeId;
  },
  forEach: function(callback, opt_this) {
    this._.records.forEach(callback, opt_this);
  },
  count: function() {
    return this._.records.filter(function(r) { return r; }).length;
  },
  /**
   * Add a record to the territory and return the ID of the added record.
   * @param {!PhoneRecord|!HomeRecord} record Record to be added to the territory.
   * @returns {number} The ID of the record added.
   */
  add: function(record) {
    var me = this;
    var _ = me._;
    if (_.typeId != record.getTerritoryTypeId()) {
      throw new Error('The types of the territory and record are not the same.');
    }
    me._triggerUpdate({action:'add'});
    _.records.push(record);
    record.bindToUpdate(function() {
      me._triggerUpdate.apply(this, arguments);
    });
    return _.records.length - 1;
  },
  remove: function(id) {
    this._triggerUpdate({action:'remove'});
    delete this._.records[id];
  },
  filter: function(callback) {
    return this._.records.filter(callback, opt_this);
  },
  toString: function() {
    return JSON.stringify(this.toObject(), 2, 2);
  },
  toObject: function() {
    var _ = this._;
    return {
      name: _.name,
      number: _.number,
      updatedOn: _.updatedOn,
      records: _.records.reduce(function(arr, record) {
        arr.push(record.toObject());
        return arr;
      }, [])
    };
  }
};
Territory.TYPE_IDS = {
  PHONE: 1,
  //HOME: 2,
  contains: function(id) {
    return Object.keys(this).some(function(key) { return this[key] == id; }, this);
  }
};
Territory.RECORD_TYPES_BY_ID = {
  1: PhoneRecord,
  //2: HomeRecord
};


function PhoneRecord(objOrNumber, opt_details, opt_noteId) {
  if ('object' == typeof objOrNumber) {
    opt_details = objOrNumber.details;
    opt_noteId = objOrNumber.noteId;
    objOrNumber = objOrNumber.number;

  }
  if (opt_noteId != undefined && !PhoneRecord.NOTE_IDS.contains(opt_noteId)) {
    throw new Error('Cannot create a phone note of type ID "' + opt_noteId + '".');
  }
  this._ = {
    number: objOrNumber,
    details: opt_details,
    noteId: opt_noteId,
    updateCallbacks: []
  };
}
PhoneRecord.prototype = {
  constructor: PhoneRecord,
  getTerritoryTypeId: function() {
    return Territory.TYPE_IDS.PHONE;
  },
  setNumber: function(number) {
    this._.number = number;
    this._triggerUpdate({action:'setNumber'});
    return this;
  },
  getNumber: function() {
    return this._.number;
  },
  setDetails: function(details) {
    this._.details = details;
    this._triggerUpdate({action:'setDetails'});
    return this;
  },
  getDetails: function() {
    return this._.details;
  },
  setNoteId: function(opt_id) {
    if (opt_id != undefined && !PhoneRecord.NOTE_IDS.contains(opt_id)) {
      throw new Error('Cannot set phone note to type ID "' + opt_id + '".');
    }
    this._.noteId = opt_id;
    this._triggerUpdate({action:'setNoteId'});
    return this;
  },
  getNoteId: function() {
    return this._.noteId;
  },
  _triggerUpdate: function(data) {
    var me = this;
    data.timeStamp = +new Date;
    me._.updateCallbacks.forEach(function(callback) {
      try {
        callback.call(me, data);
      }
      catch (e) {
        setTimeout(function(){throw e}, 0);
      }
    });
  },
  bindToUpdate: function(callback) {
    this._.updateCallbacks.push(callback);
  },
  toString: function() {
    return JSON.stringify(this.toObject(), 2, 2);
  },
  toObject: function() {
    var _ = this._;
    var ret = {
      number: _.number
    };
    if (_.details) {
      ret.details = _.details;
    }
    if (_.noteId) {
      ret.noteId = _.noteId;
    }
    return ret;
  }
};
PhoneRecord.NOTE_IDS = {
  FOREIGN_LANGUAGE: 1,
  FAX: 2,
  OUT_OF_SERVICE: 3,
  DO_NOT_CALL: 4,
  CENSUS: 5,
  contains: function(id) {
    return Object.keys(this).some(function(key) { return this[key] == id; }, this);
  }
};


function HomeRecord() {
  throw new Error('The HomeRecord class has not yet been implemented.');
}