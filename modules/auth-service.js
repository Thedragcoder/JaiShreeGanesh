// require bcrypt
const bcrypt = require('bcryptjs'); 
// require mongoose module 
const mongoose = require('mongoose'); 
// Add the "dotenv" module 
require('dotenv').config();

// Define a new "userSchema" : according to the given specification 
const Schema = mongoose.Schema;

const userSchema = new Schema({
  userName: {
    type: String,
    unique: true
  },
  password: String,
  email: String,
  loginHistory: [{
    dateTime: Date,
    userAgent: String
  }]
});

let User; // to be defined on new connection (see initialize)

module.exports = {
  userSchema,
  User
};

/**
 * Function to initialize the connection to MongoDB and initialize the User object.
 * @returns {Promise<void>} - Resolves if the connection is successful, otherwise rejects with an error.
 */
function initialize() {
    return new Promise(function (resolve, reject) {
      let db = mongoose.createConnection(process.env.MONGODB);
      db.on('error', (err) => {
        reject(err); // reject the promise with the provided error
      });
      db.once('open', () => {
        User = db.model("users", userSchema);
        resolve();
      });
    });
  }

/**
 * Function to register a new user.
 * @param {Object} userData - Data of the user to be registered.
 * @returns {Promise<void>} - Resolves if registration is successful, otherwise rejects with an error message.
 */
function registerUser(userData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Check if passwords match
        if (userData.password !== userData.password2) {
          reject("Passwords do not match");
          return;
        }
  
        // Hash the user's password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
  
        // Update the user data with the hashed password
        userData.password = hashedPassword;
  
        // Create a new User object
        let newUser = new User(userData);
  
        // Save the new user to the database
        newUser.save((err) => {
          if (err) {
            // Check if the error is due to duplicate key (username already taken)
            if (err.code === 11000) {
              reject("User Name already taken");
            } else {
              reject(`There was an error creating the user: ${err}`);
            }
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject('There was an error encrypting the password');
      }
    });
  }
  
  /**
 * Function to check user credentials.
 * @param {Object} userData - Data of the user to be checked.
 * @returns {Promise<Object>} - Resolves with the user object if credentials are correct, otherwise rejects with an error message.
 */
function checkUser(userData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Find user by userName
        const user = await User.findOne({ userName: userData.userName });
  
        if (!user) {
          reject(`Unable to find user: ${userData.userName}`);
          return;
        }
  
        // Compare the entered password with the hashed password from the database
        const passwordMatch = await bcrypt.compare(userData.password, user.password);
  
        if (!passwordMatch) {
          reject(`Incorrect Password for user: ${userData.userName}`);
          return;
        }
  
        // Password matches, update login history
        if (user.loginHistory.length === 8) {
          user.loginHistory.pop(); // Remove last element if login history exceeds 8
        }
        user.loginHistory.unshift({ dateTime: new Date().toString(), userAgent: userData.userAgent }); // Add new login history
  
        // Update login history in the database
        await User.updateOne(
          { userName: user.userName },
          { $set: { loginHistory: user.loginHistory } }
        );
  
        resolve(user);
      } catch (error) {
        reject(error.message);
      }
    });
  }

module.exports = {
  initialize,
  registerUser,
  checkUser
};
