

const functions = require('firebase-functions');

const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);


const notes = {
	"10084" : 2,	//emoji coeur
	"128077" : 1,	//emoji pouce vers le haut
	"85" : 0,		// le "U" de "Une autre"
	"80" : 0,		// le "P" de "Pas d'avis"
	"128078" : -1,	//emoji pouce vers le bas
	"128169" : -2,	//emoji caca
}

exports.enregistrerAvisChatbot = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP enregistrerAvisChatbot : " + JSON.stringify(request.body) );

	const chatfuelUserId	= request.body["chatfuel user id"];

	const messengerUserId	= request.body["messenger user id"];

	const firstName			= request.body["first name"];

	const lastName			= request.body["last name"];

	const feedbackAvis 		= request.body["feedback: avisGeneral"];

	const feedbackComment	= request.body["feedback: commentaire"];

	const feedbackMail 		= request.body["feedback: userEmail"];

	const feedbackFan 		= request.body["feedback: fan"];


	if( !verifyParam(chatfuelUserId) ) {
				badRequest(response, "Unable to find request parameter 'chatfuelUserId'.");
				return;
	}
	
	if( !verifyParam(firstName) ) {
				badRequest(response, "Unable to find request parameter 'firstName'.");
				return;
	}
	if( !verifyParam(lastName) ) {
				badRequest(response, "Unable to find request parameter 'lastName'.");
				return;
	}


	var infosUser = {};

	infosUser["nom"] = firstName + " " + lastName;
	infosUser["messengerUserId"] = messengerUserId;

	var reponse = {};

	if(feedbackAvis) {
		reponse["note"] = notes[feedbackAvis.codePointAt(0)];
	}

	if(feedbackComment) {
		reponse["commentaire"] = feedbackComment;
	}

	if(feedbackMail) {
		reponse["mail"] = feedbackMail;
	}

	if(feedbackFan) {
		reponse["fan"] = feedbackFan;
	}

	var d = new Date();

	var refUser = admin.database().ref('users').child(chatfuelUserId);

	var updates = {};
	updates["nom"] = firstName + " " + lastName;
	updates["messengerUserId"] = messengerUserId;	
	updates["/avisChatbot/" + d.getFullYear().toString() + "_" + (d.getMonth() + 1).toString() + d.getDate().toString()] = reponse;


	refUser.update(updates)
		.then(function() {
			response.end();
		});


	response.end();

});



exports.enregistrerAvisPublication = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP enregistrerAvisPublication : " + JSON.stringify(request.body) );

	const chatfuelUserId	= request.body["chatfuel user id"];

	const messengerUserId	= request.body["messenger user id"];

	const firstName			= request.body["first name"];

	const lastName			= request.body["last name"];

	const userAnswer 		= request.body["userAnswer"];

	const uneId 			= request.body["uneId"];

	if( !verifyParam(chatfuelUserId) ) {
				badRequest(response, "Unable to find request parameter 'chatfuelUserId'.");
				return;
	}
	if( !verifyParam(messengerUserId) ) {
				badRequest(response, "Unable to find request parameter 'messengerUserId'.");
				return;
	}
	if( !verifyParam(firstName) ) {
				badRequest(response, "Unable to find request parameter 'firstName'.");
				return;
	}
	if( !verifyParam(lastName) ) {
				badRequest(response, "Unable to find request parameter 'lastName'.");
				return;
	}
	if( !verifyParam(userAnswer) ) {
				badRequest(response, "Unable to find request parameter 'userAnswer'.");
				return;
	}
	if( !verifyParam(uneId) ) {
				badRequest(response, "Unable to find request parameter 'uneId'.");
				return;
	}


	var infosUser = {};

	infosUser["nom"] = firstName + " " + lastName;
	infosUser["messengerUserId"] = messengerUserId;

	var reponse = {};

	reponse["note"] = notes[userAnswer.codePointAt(0)];
	reponse["titre"] = uneId;

	var refUser = admin.database().ref('users').child(chatfuelUserId);
	var newAvisKey = refUser.child('avisPublications').push().key;


	var updates = {};
	updates["nom"] = firstName + " " + lastName;
	updates["messengerUserId"] = messengerUserId;	
	updates["/avisPublications/" + newAvisKey] = reponse;


	refUser.update(updates)
		.then(function() {
			response.end();
		});


	response.end();

});


exports.montrerUne = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP montrerUne : " + JSON.stringify(request.query) );

	const BDD_chatbot = admin.database().ref();

	var lecture = BDD_chatbot.child('publications').once('value')
		.then(function(snapshot) {

			var publications = snapshot.val();

			const uneId = request.query["uneId"];

			var uneIndex = parseInt(uneId, 10);

			if( !verifyParam(uneIndex) ) {
				badRequest(response, "Unable to find request parameter 'uneIndex'.");
				return;
			}


			if( isNaN(uneIndex) ) {
				uneIndex = 0;
			} 
			else {
				uneIndex++;
			}


			const nbUnes = publications.length;
			const termine = uneIndex === nbUnes - 1;

			if(uneIndex >= 0) {

				if(uneIndex < nbUnes) {

					response.json({
						"set_attributes": {
							"uneId": uneIndex,
							"termine": termine
						},
						"messages": [
							{
								"text": publications[uneIndex]['nom'] + ' (' + publications[uneIndex]['date'] + ')'
							},
								{
									"attachment": {
									"type": "image",
									"payload": {
										"url": publications[uneIndex]['url_une']
									}
								}
							}
						]
					});
				}

			}

			response.end();

		});


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