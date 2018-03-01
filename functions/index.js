const functions = require('firebase-functions');

const admin = require('firebase-admin');

const publicationsJSON = require('./data/publications');

admin.initializeApp(functions.config().firebase);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

/*
exports.helloWorld = functions.https.onRequest((request, response) => {
 response.json({ "messages": [ { "text": "Hello from Firebase!" } ] });
});
*/

exports.montrerUne = functions.https.onRequest((request, response) => {

	//const publications = admin.database().ref('/publications');

	const uneId = request.query["uneId"];

	console.log("uneId = " + uneIndex);

	var uneIndex = parseInt(uneId, 10);

	console.log("uneIndex = " + uneIndex);

	if( !verifyParam(uneIndex) ) {
		badRequest(response, "Unable to find request parameter 'uneIndex'.");
		return;
  	}


	if( isNaN(uneIndex) ) {
		console.log("uneIndex isNaN");
		uneIndex = 0;
	} 
	else {
		console.log("uneIndex isaN");
		uneIndex++;
	}

	console.log("uneIndex = " + uneIndex);

	if(uneIndex >= 0 && uneIndex < 3) {


	response.json({

 "messages": [
    {
      "attachment":{
        "type":"template",
        "payload":{
          "template_type":"generic",
          //"image_aspect_ratio": "square",
          "default_action":[
                {
                  "type":"web_url",
                  "url": publicationsJSON.publications[uneIndex].url_une,
                }],
          "elements":[
            {
              "title": publicationsJSON.publications[uneIndex].nom,
              "image_url": publicationsJSON.publications[uneIndex].url_une,
              "subtitle":"Size: M",
              "buttons":[
                {
                  "type":"web_url",
                  "url": publicationsJSON.publications[uneIndex].url_une,
                  "title":"Voir la une"
                }
              ]
            },
            {
              "title": publicationsJSON.publications[uneIndex + 1].nom,
              "image_url": publicationsJSON.publications[uneIndex + 1].url_une,
              "subtitle":"Size: L",
              "buttons":[
                {
                  "type":"web_url",
                  "url":publicationsJSON.publications[uneIndex + 1].url_une,
                  "title":"Voir la une"
                }
              ]
            }
          ]
        }
      }
    }
  ]


	});

	}

	response.end();

  	/*const une_db = publications.child(parseInt(uneIndex, 10));

  	une_db.once('nom').then(function(nom_une){

  		response.json({ "messages": [ { "text": nom_une } ] });

  	});
	*/

});


/*
	Verify the value of a query parameter.
	Returns true if the value is correct, false otherwise
	params:
	 - value        : the param value (string)
*/
function verifyParam(value) {

  if( value === undefined || value === null || value.length === 0 ) {
  	return false;
  }
  return true;

}

/*
	Send a bad request status with a message.
	params:
	 - response     : the response to the HTTP request
	 - message : the message to return if the request is not valid
*/
function badRequest(response, message) {

	console.log(message);

	response.status(400).json({ "messages": [ { "text": message } ] });

}