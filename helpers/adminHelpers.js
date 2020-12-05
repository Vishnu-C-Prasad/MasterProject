const db = require('../config/connection');
const collection = require('../config/collection');
const { ObjectID } = require('mongodb');
const bcrypt = require('bcrypt');
const mailer = require('../utils/mailer');

module.exports = {
    doLogin: ({ email, password }) => {
        return new Promise(async (resolve, reject) => {
            const admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email });
            if (admin) {
                bcrypt.compare(password, admin.password).then((status) => {
                    if (status) {
                        delete admin.password
                        resolve({ status: true, admin });
                    } else {
                        reject({ status: false, errMessage: 'Incorrect password.' });
                    }
                });
            } else {
                reject({ status: false, errMessage: 'Cannot find admin.' });
            }
        });
    },
    updateProfilePicture: (adminId, profilePicStatus) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADMIN_COLLECTION).updateOne({
                _id: ObjectID(adminId)
            }, {
                $set: {
                    profilePic: profilePicStatus
                }
            }).then(async (response) => {
                const admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ _id: ObjectID(adminId) });
                delete admin.password;
                resolve({ admin, alertMessage: 'Success.' });
            }).catch((error) => {
                reject({ error, errMessage: 'Faild to update profile picture.' });
            });
        });
    },
    updateAdminDetails: ({ name, email }, adminId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ADMIN_COLLECTION).updateOne({
                _id: ObjectID(adminId)
            }, {
                $set: {
                    name,
                    email
                }
            }).then(async (response) => {
                const admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ _id: ObjectID(adminId) });
                delete admin.password;
                resolve({ admin, alertMessage: 'Updated successfully.' });
            }).catch((error) => {
                reject({ error, errMessage: 'Failed to update admin details.' });
            });
        });
    },
    changePassword: ({ password, newPassword, confirmPassword }, adminId) => {
        return new Promise(async (resolve, reject) => {
            const admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ _id: ObjectID(adminId) });
            bcrypt.compare(password, admin.password).then(async (status) => {
                if (status) {
                    if (newPassword === confirmPassword) {
                        newPassword = await bcrypt.hash(newPassword, 10);
                        db.get().collection(collection.ADMIN_COLLECTION).updateOne({
                            _id: ObjectID(adminId)
                        }, {
                            $set: {
                                password: newPassword
                            }
                        }).then((response) => {
                            resolve({ alertMessage: 'Password changed successfully' });
                        })
                    } else {
                        reject({ errMessage: "Entered passwords dosen't match" });
                    }
                } else {
                    reject({ errMessage: 'Incorrect password.' });
                }
            });
        });
    },
    addOwners: (ownerDetails, adminId) => {
        return new Promise(async (resolve, reject) => {
            const password = Math.floor(100000 + Math.random() * 900000).toString();

            ownerDetails.password = await bcrypt.hash(password, 10);
            ownerDetails.dateCreated = new Date();

            mailer.sendMail({
                to: ownerDetails.email,
                subject: 'Added your theatre to MovieMaster',
                html: `<h1>Hello ${ownerDetails.ownerName},</h1><p>We added your theatre ${ownerDetails.theatreName} to MovieMaster. You can now login to your theatre panel using the following credentials.</p><h3>EMAIL: ${ownerDetails.email}</h3><h3>PASSWORD: ${password}</h3>`
            }).then((response) => {
                db.get().collection(collection.THEATRE_COLLECTION).insertOne(ownerDetails).then((response) => {
                    resolve({ response, alertMessage: 'Successfully added and send credentials to owner.' });
                }).catch((error) => {
                    reject({ error, errMessage: 'Failed to add owner details.' });
                });
            }).catch((error) => {
                reject({ error, errMessage: 'Failed to send credentials to owner.' });
            });
        });
    },
    getOwners: () => {
        return new Promise(async (resolve, reject) => {
            const owners = await db.get().collection(collection.THEATRE_COLLECTION).find().toArray();
            resolve(owners);
        });
    },
    getOwner: (ownerId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.THEATRE_COLLECTION).findOne({ _id: ObjectID(ownerId) }).then((response) => {
                resolve(response);
            }).catch((error) => {
                reject({ error, errMessage: 'Details not found.' });
            });
        });
    },
    editOwner: (ownerDetails) => {
        return new Promise(async (resolve, reject) => {
            const owner = await db.get().collection(collection.THEATRE_COLLECTION).findOne({ _id: ObjectID(ownerDetails.ownerId) });
            delete ownerDetails.ownerId;

            if (owner.email !== ownerDetails.email) {
                const password = Math.floor(100000 + Math.random() * 900000).toString();
                ownerDetails.password = await bcrypt.hash(password, 10);

                mailer.sendMail({
                    to: ownerDetails.email,
                    subject: 'Added your theatre to MovieMaster',
                    html: `<h1>Hello ${ownerDetails.ownerName},</h1><p>We added your theatre ${ownerDetails.theatreName} to MovieMaster. You can now login to your theatre panel using the following credentials.</p><h3>EMAIL: ${ownerDetails.email}</h3><h3>PASSWORD: ${password}</h3>`
                }).then((response) => {
                    db.get().collection(collection.THEATRE_COLLECTION).updateOne({
                        _id: ObjectID(owner._id)
                    }, {
                        $set: ownerDetails
                    }).then((response) => {
                        resolve({ response, alertMessage: 'Successfully updated and send credentials to owner.' });
                    }).catch((error) => {
                        reject({ error, errMessage: 'Failed to update.' });
                    });
                }).catch((error) => {
                    reject({ error, errMessage: 'Failed to send credentials to owner.' });
                });
            } else {
                db.get().collection(collection.THEATRE_COLLECTION).updateOne({
                    _id: ObjectID(owner._id)
                }, {
                    $set: ownerDetails
                }).then((response) => {
                    resolve({ response, alertMessage: 'Successfully updated.' });
                }).catch((error) => {
                    reject({ error, errMessage: 'Failed to update.' });
                });
            }
        });
    },
    deleteOwner: ({ ownerId }) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.THEATRE_COLLECTION).removeOne({ _id: ObjectID(ownerId) }).then((response) => {
                resolve({ status: true, alertMessage: 'Deleted Successfully.' });
            }).catch((error) => {
                reject({ status: false, error, errMessage: 'Failed to delete owner.' });
            })
        });
    }
}