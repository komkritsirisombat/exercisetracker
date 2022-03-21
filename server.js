const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
require('dotenv').config()
const mongoose = require('mongoose');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

let uri = "mongodb+srv://myusername:" + process.env.PW + "@cluster0.gcejf.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


let exerciseSessionSchema = new mongoose.Schema({
  username: { type: String, require: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: String
});

let userSchema = new mongoose.Schema({
  username: { type: String, requried: true }
  //log: [exerciseSessionSchema]
});

let loginfo = new mongoose.Schema({
  username: { type: String, require: true },
  count: Number,
  log: Array
});

let Session = mongoose.model('Session', exerciseSessionSchema);
let User = mongoose.model('User', userSchema);
let LogInfo = mongoose.model('Loginfo', loginfo);


app.post('/api/users', (request, response) => {

  let newUser = new User({ username: request.body.username });
  newUser.save((error, saveUser) => {
    if (!error) {
      let responseUserObject = {};
      responseUserObject['username'] = saveUser.username;
      responseUserObject['_id'] = saveUser.id;
      response.json(responseUserObject);
    }
  });
});

app.get('/api/users', (request, response) => {
  User.find({}, (err, responseOfUser) => {
    if (!err) {
      response.json(responseOfUser);
    } else {
      response.json({ error: '' });
    }
  })
});



app.post('/api/users/:_id/exercises', (request, response) => {
  let idJson = { "id": request.params._id };
  let checkDate = new Date(request.body.date);
  let idToCheck = idJson.id;
  console.log('idJson', idJson);

  let noDateHandler = () => {
    if (checkDate instanceof Date && !isNaN(checkDate)) {
      return checkDate;
    } else {
      checkDate = new Date();
    }
  };


  User.findById(idToCheck, (err, data) => {
    noDateHandler(checkDate);
    if (err) {
      console.log(err);
    } else {
      const SessionSave = new Session({
        username: data.username,
        description: request.body.description,
        duration: request.body.duration,
        date: checkDate.toDateString()
      })
      SessionSave.save((err, saveData) => {
        if (err) {
          console.log(err)
        } else {
          response.json({
            _id: idToCheck,
            username: saveData.username,
            description: saveData.description,
            duration: saveData.duration,
            date: saveData.date.toString()
          });
        }
      });
    }

  });
});


/*
app.get('/api/users/:id/logs', (request, response) => {
  const { from, to, limit } = request.query;
  console.log('my query is xxx ::: ' + request.query)
  let idJson = { "id": request.params.id };
  let idToCheck = idJson.id;
  console.log('idJson', idToCheck)

  User.findById(idToCheck, (err, data) => {

    let queryInfunction = {
      username: data.username
    }

    if (err) {
      console.log(err);
    } else {
      console.log('query', queryInfunction)
      Session.find({ username: queryInfunction.username }, (err, data) => {
        console.log('data-query fron /api/users/:id/logs : ', data);
        let loggedArray = [];
        if (err) {
          console.log(err);
        } else {
          let documents = data;
          loggedArray = documents.map((item) => {
            let dateText = item.date.toString();
            return {
              username: item.username,
              count: data.length,
              _id: item._id,
              log: [{
                description: item.description,
                duration: item.duration,
                date: item.date.toString(),
              }]
            };
          });

        }
      });
    }

  });

});
*/


app.get('/api/users/:_id/logs', (req, res) => {
  const id = req.body["_id"] || req.params._id;
  var fromDate = req.query.from;
  var toDate = req.query.to;
  var limit = req.query.limit;

  console.log(id, fromDate, toDate, limit);

  // Validate the query parameters
  if (fromDate) {
    fromDate = new Date(fromDate);
    if (fromDate == "Invalid Date") {
      res.json("Invalid Date Entered");
      return;
    }
  }

  if (toDate) {
    toDate = new Date(toDate);
    if (toDate == "Invalid Date") {
      res.json("Invalid Date Entered");
      return;
    }
  }

  if (limit) {
    limit = new Number(limit);
    if (isNaN(limit)) {
      res.json("Invalid Limit Entered");
      return;
    }
  }

  // Get the user's information
  User.findOne({ "_id" : id }, (error, data) => {
    if (error) {
      res.json("Invalid UserID");
      return console.log(error);
    }
    if (!data) {
      res.json("Invalid UserID");
    } else {

      // Initialize the object to be returned
      const usernameFound = data.username;
      var objToReturn = { "_id" : id, "username" : usernameFound };

      // Initialize filters for the count() and find() methods
      var findFilter = { "username" : usernameFound };
      var dateFilter = {};

      // Add to and from keys to the object if available
      // Add date limits to the date filter to be used in the find() method on the Exercise model
      if (fromDate) {
        objToReturn["from"] = fromDate.toDateString();
        dateFilter["$gte"] = fromDate;
        if (toDate) {
          objToReturn["to"] = toDate.toDateString();
          dateFilter["$lt"] = toDate;
        } else {
          dateFilter["$lt"] = Date.now();
        }
      }

      if (toDate) {
        objToReturn["to"] = toDate.toDateString();
        dateFilter["$lt"] = toDate;
        dateFilter["$gte"] = new Date("1960-01-01");
      }

      // Add dateFilter to findFilter if either date is provided
      if (toDate || fromDate) {
        findFilter.date = dateFilter;
      }

      // console.log(findFilter);
      // console.log(dateFilter);

      // Add the count entered or find the count between dates
      Session.count(findFilter, (error, data) => {
        if (error) {
          res.json("Invalid Date Entered");
          return console.log(error);
        }
        // Add the count key 
        var count = data;
        if (limit && limit < count) {
          count = limit;
        }
        objToReturn["count"] = count;


        // Find the exercises and add a log key linked to an array of exercises
        Session.find(findFilter, (error, data) => {
          if (error) return console.log(error);

          // console.log(data);

          var logArray = [];
          var objectSubset = {};
          var count = 0;

          // Iterate through data array for description, duration, and date keys
          data.forEach(function(val) {
            count += 1;
            if (!limit || count <= limit) {
              let myDate = val.date;
              objectSubset = {};
              objectSubset.description = val.description;
              objectSubset.duration = parseInt(val.duration.toString());
              objectSubset.date = myDate.toString();
              console.log(objectSubset);
              logArray.push(objectSubset);
            }
          });

          // Add the log array of objects to the object to return
          objToReturn["log"] = logArray;

          // Return the completed JSON object
          res.json(objToReturn);
        });

      });

    }
  });
});



/*
app.get("/api/users/:_id/logs", (req, res) => {
  const { from, to, limit } = req.query;
  const userId = req.params._id;
 
  console.log(userId)
 
  User.findById(userId, (err, data) => {
    if (!data) {
      res.send("Unknow userId");
    } else {
      const username = data.username;
      console.log({ "from": from, "to": to, "limit": limit });
 
      Session.find({ userId }, { date: { $gte: new Date(from), $lte: new Date(to) } }).select(["id", "description", "duration", "date"]).limit(+limit)
        .exec((err, data) => {
          console.log(data)
          let customdata = data.map(exer => {
            let dateFormatted = new Date(exer.date);
            return { 
              id: exer.id, 
              description: exer.description, 
              duration: exer.duration, 
              date: dateFormatted.toDateString() 
              }
          });
          if (!data) {
            res.json({
              "userId": userId,
              "username": username,
              "count": 0,
              "log": []
            });
          } else {
            res.json({
              "userId": userId,
              "username": username,
              "count": data.length,
              "log": customdata
            });
          }
        });
    }
  });
 
});
*/

/*
app.get('/api/users/:_id/logs', (req, res) => {
  const { from, to, limit } = req.query;
  let idJson = { "id": req.params._id };
  let idToCheck = idJson.id;

  User.findById(idToCheck, (err, data) => {
    var query = {
      username: data.username
    }

    if (from !== undefined && to === undefined) {
      query.date = { $gte: new Date(from) }
    } else if (to !== undefined && from === undefined) {
      query.date = { $lte: new Date(to) }
    } else if (from !== undefined && to !== undefined) {
      query.date = { $gte: new Date(from), $lte: new Date(to) }
    }

    let limitChecker = (limit) => {
      let maxlimit = 100;
      if (limit) {
        return limit;
      } else {
        return maxlimit;
      }
    }// end limitChecker

    if (err) {
      console.log("error id ", err);
    } else {
      Session.find((query), null, { limit: limitChecker(+limit) }, (err, data) => {
        let loggedArray = [];

        if (err) {
          console.log("error with");
        } else {
          let documents = data;
          loggedArray = documents.map((item) => {
            return {
              "description": item.description,
              "duration": item.duration,
              "log": item.date.toString()
            }
          });

          const test = new LogInfo({
            "username": data.username,
            "count": loggedArray.length,
            "log": loggedArray
          });

          test.save((err, data) => {
            if (err) {
              console.log('errro  saving ', err);
            } else {
              res.json({
                "_id": idToCheck,
                "username": data.username,
                "count": data.length,
                "log": loggedArray
              });
            }
          });
        }//end if
      });
    }
  });//end userInfo.find
});
*/

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
