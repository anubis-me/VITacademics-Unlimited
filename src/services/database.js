/**
 * Persistent data storage service implemnted with MongoDB.
 * @module services/database
 */
const crypto = require('crypto');
const MongoClient = require('mongodb').MongoClient;
const Promise = require('bluebird');

// Schema
// {
//     _id: 'hash(reg_no)',
//     marks: [{
//     class_number: 'string',
//     assessment_title: 'string',
//     scored_marks: 'number',
//     semester: 'string',
//     year: 'string' }]
// }

/**
 * @class MarksCollection
 */
class MarksCollection {
    constructor(collection) {
        this._collection = collection;
    }

    /**
     * @method insertOrUpdate
     * @param {String} reg_no
     * @param {Object} marks
     * @param {Promise<Object>}
     */
    insertOrUpdate(reg_no, marks) {
        const id = crypto.createHash('md5')
            .update(reg_no)
            .digest('hex');
        const update = {
            $set: {
                marks: marks
            }
        }
        return this._collection.updateOne({ _id: id }, update, { upsert: true });
    }

    /**
     * @method aggregate
     * @param {String} classNumber
     * @param {String} semester
     * @param {String} year
     * @returns {Promise<Object>}
     */
    aggregate(classNumber, semester, year) {
        return this._collection.aggregate([
            {
              $unwind: '$marks'
            },
            {
                $match: {
                  'marks.class_number': classNumber,
                  'marks.semester': semester,
                  'marks.year': year
                }
            },
            {
                $group: {
                    _id: '$marks.title',
                    average: { $avg: '$marks.scored_marks' },
                    count: { $sum: 1 },
                    minimum: { $min: '$marks.scored_marks' },
                    maximum: { $max: '$marks.scored_marks' },
                    standard_deviation: { $stdDevPop: '$marks.scored_marks' }
                }
            }
        ])
        .toArray()
        .then(result => {

          const aggregate = {};
          for (let i=0; i<result.length; i++) {
            const key = result[i]._id;
            delete result[i]._id;
            aggregate[key] = result[i];
          }

         return aggregate;
        });
    }
}

/**
 * Connects to the MongoDB instance.
 * @function connect
 * @param {String} url
 * @returns {Promise}
 */
module.exports.connect = (url) => {
    return MongoClient.connect(url, { promiseLibrary: Promise })
        .then(db => {
            return {
                marks: new MarksCollection(db.collection('marks'))
            }
        })
}
