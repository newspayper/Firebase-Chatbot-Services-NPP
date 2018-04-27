

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

/*
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
*/

exports.showTest = functions.https.onRequest((request, response) => {


	var JSONquimarchepas = {
	    "set_attributes":
	    {
	        "indexPublication":2,
	        "termine":true
	    },
	    "messages": [
	        {
	            "text":"@@@Le 1 - socialiste;horando Le Canard Enchaîné - grève;machin;truc Le Monde Diplomatique - tag1;tag2 ",
	            "quick replies": [
	                {
	                    "title":"Le 1",
	                    "block_names": ["Montre Details"],
	                    "set_attributes":{
	                        "titre":"Le 1"
	                    }
	                },
	                {
	                    "title":"Le Canard Enchaîné",
	                    "block_names": ["Montre Details"],
	                    "set_attributes":{
	                        "titre":"Le Canard Enchaîné"
	                    }
	                },
	                {
	                    "title":"Le Monde Diplomatique",
	                    "block_names": ["Montre Details"],
	                    "set_attributes":{
	                        "titre":"Le Monde Diplomatique"
	                    }
	                }
	            ]
	        }
	    ]

	};

	var JSON = {
		"set_attributes": 
		{
			"indexPublication":2,
			"termine":true
		},
		"messages": [
		    {
		      "text":  "Le 1 - socialiste;horando\u000ALe Canard Enchaîné - grève;machin;truc\u000ALe Monde Diplomatique - tag1;tag2",
		      "quick_replies": [
		        {
					"title":"Le 1",
		        	"block_names": ["Fin"],
		        	"set_attributes":
					{
						"titre":"Le 1",
						"toto":"fpleurgh1"
					}
				},
				{
					"title":"Le Canard Enchaîné",
					"block_names": ["Fin"],
					"set_attributes":
					{
						"titre":"Le Canard Enchaîné",
						"toto":"fpleurgh2"
					}
				},
				{
					"title":"Le Monde Diplomatique",
					"block_names": ["Fin"],
					"set_attributes":
					{
						"titre":"Le Monde Diplomatique",
						"toto":"fpleurgh3"
					}
				}
		      ]
		    }
	  	]
	};

	var JSONtest = 
	{
		"messages": [
			{
				"attachment":
				{
					"type": "image",
					"payload": 
					{
						"url": "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png"
					}
        		}
			}
		]
	};

	response.json(JSONtest);

});



exports.showPublications = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showPublications : " + JSON.stringify(request.query) );

	const BDD_chatbot = admin.database().ref();

	var lecture = BDD_chatbot.child('publications').once('value')
		.then(function(snapshot) {

			var publications = snapshot.val();

			var indexes = Object.keys(publications);

			const indexPublicationParam = request.query["indexPublication"];

			var indexPublication = parseInt(indexPublicationParam, 10);

			if( !verifyParam(indexPublication) ) {
				badRequest(response, "Unable to find request parameter 'indexPublication'.");
				return;
			}

			if( isNaN(indexPublication) ) {
				indexPublication = 0;
			}

			const nbPublications = indexes.length;
			const nbAAfficher = 3;

			var limiteAffichage, termine;

			if(indexPublication + nbAAfficher > nbPublications) {
				limiteAffichage = nbPublications;
				termine = true;
			}
			else {
				limiteAffichage = indexPublication + nbAAfficher;
				termine = false;
			}

			var quickReplies = [];

			var texteResume = '';

			//Insertion des quick replies standard
			quickReplies.push({"title": "Stop","block_names": ["Fin"]});

			if(!termine)
			{
				quickReplies.push(
					{
						"title": "La suite",
						"block_names": ["Montre Publications"],
						"set_attributes":
						{
							"indexPublication": limiteAffichage
						}
					}
				);
			}
			else
			{
				quickReplies.push(
					{
						"title": "Recommencer",
						"block_names": ["Montre Publications"],
						"set_attributes":
						{
							"indexPublication": 0
						}
					}
				);
			}

			//Message de fin si jamais il n'y a plus de publication à afficher
			if(termine && (indexPublication >= nbPublications))
				texteResume = "Désolé, je n'ai plus de publications en réserve pour le moment !"

			for (var i = indexPublication; i < limiteAffichage; i++) {

				texteResume += publications[indexes[i]]['titre'] + ' - ' + publications[indexes[i]]['tags'] + '\u000A'

				quickReplies.push(
					{
						"title": publications[indexes[i]]['titre_short'],
						"block_names": ["Montre Details"],
						"set_attributes":
						{
							"publication": indexes[i],
						}
					}
				);
			}

			var reponseJSON = {};

			reponseJSON.set_attributes = 
			{
				"termine": termine
			};

			reponseJSON.messages =
			[
				{
					"text": texteResume,
					"quick_replies": quickReplies
				}
			];

			console.log(JSON.stringify(reponseJSON));

			response.json(reponseJSON);

		});
		
});


exports.showSommaire = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showSommaire : " + JSON.stringify(request.query) );

	const BDD_chatbot = admin.database();

	const listePublications = BDD_chatbot.ref("publications");


	const idPublication = request.query["publication"];

	if( !verifyParam(idPublication) ) {
		badRequest(response, "Unable to find request parameter 'publication'.");
		return;
	}

	var lecture = listePublications.child(idPublication).once('value')
		.then(function(snapshot) {

		var publication = snapshot.val();

		var texteSommaire = publication.sommaire;

		var reponseJSON = 
		{
	    	"messages":[
	        	{
	            	"text": texteSommaire
	        	}
	    	]
		};

		console.log("Réponse JSON : " + reponseJSON);

		response.json(reponseJSON);
	});

});


exports.showCouverture = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showCouverture : " + JSON.stringify(request.query) );

	const BDD_chatbot = admin.database();

	const listePublications = BDD_chatbot.ref("publications");

	const idPublication = request.query["publication"];

	if( !verifyParam(idPublication) ) {
		badRequest(response, "Unable to find request parameter 'publication'.");
		return;
	}

	var lecture = listePublications.child(idPublication).once('value')
		.then(function(snapshot) {

		var publication = snapshot.val();

		var urlCouverture = publication.URL_couv;

		var reponseJSON = 
		{
			"messages": [
				{
					"attachment":
					{
						"type": "image",
						"payload": 
						{
							"url": urlCouverture
						}
	        		}
				}
			]
		};

		console.log("Réponse JSON : " + reponseJSON);

		response.json(reponseJSON);

	});

});


exports.enregistrerAvisPublication = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP enregistrerAvisPublication : " + JSON.stringify(request.body) );

	const messengerUserId	= request.body["messenger user id"];

	const firstName			= request.body["first name"];

	const lastName			= request.body["last name"];

	const userAnswer 		= request.body["userAnswer"];

	const idPublication		= request.body["publication"];

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
	if( !verifyParam(idPublication) ) {
				badRequest(response, "Unable to find request parameter 'publication'.");
				return;
	}


	var infosUser = {};

	infosUser["nom"] = firstName + " " + lastName;
	infosUser["messengerUserId"] = messengerUserId;

	var reponse = {};

	reponse["note"] = notes[userAnswer.codePointAt(0)];
	reponse["publicationId"] = idPublication;

	var refUser = admin.database().ref('users').child(messengerUserId);
	
	var updates = {};
	updates["nom"] = firstName + " " + lastName;
	updates["messengerUserId"] = messengerUserId;	
	updates["/avisPublications/" + idPublication] = reponse;


	refUser.update(updates)
		.then(function() {
			response.end();
		});

});


/*
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
*/

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