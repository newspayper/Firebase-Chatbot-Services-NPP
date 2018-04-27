

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

/*
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
*/

exports.showTest = functions.https.onRequest((request, response) => {

var JSONtest = {
	"set_attributes": 
	{
		"indexPublication":2,
		"termine":true
	},
	"messages": [
		{
			"text":  "Liste des magazines et des tags",
			"quick replies": [
			{
				"title":"Le 1",
				"set_attributes":
				{
					"titre":"Le 1",
					"toto":"fpleurgh"
				}
			},
			{
				"title":"Le Canard Enchaîné",
				"set_attributes":
				{
					"titre":"Le Canard Enchaîné",
					"toto":"fpleurgh"
				}
			},
			{
				"title":"Le Monde Diplomatique",
				"set_attributes":
				{
					"titre":"Le Monde Diplomatique",
					"toto":"fpleurgh"
				}
			}
			]
		}
	]
};


var JSONexemple = {
	"set_attributes": 
	{
		"indexPublication":2,
		"termine":true
	},
	"messages": [
    {
      "text":  "Did you enjoy the last  \u000A game of the CF Rockets?",
      "quick_replies": [
        {
          "title":"Loved it!",
          "block_names": ["Au revoir"]
        },
        {
          "title":"Not really...",
          "url": "https://us-central1-chatbot-npp.cloudfunctions.net/showTest",
          "type":"json_plugin_url"
        }
      ]
    }
  ]
};


var JSONtemp = {

    "set_attributes":{
        "indexPublication":2,
        "termine":true
    },
    "messages":[
        {
            "text":"@@@Le 1 - socialiste;horando Le Canard Enchaîné - grève;machin;truc Le Monde Diplomatique - tag1;tag2 ",
            "quick replies":[
                {
                    "title":"Le 1",
                    "block_names":[
                        "Montre Details"
                    ],
                    "set_attributes":{
                        "titre":"Le 1"
                    }
                },
                {
                    "title":"Le Canard Enchaîné",
                    "block_names":[
                        "Montre Details"
                    ],
                    "set_attributes":{
                        "titre":"Le Canard Enchaîné"
                    }
                },
                {
                    "title":"Le Monde Diplomatique",
                    "block_names":[
                        "Montre Details"
                    ],
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
	        	"block_names": ["Au revoir"],
	        	"set_attributes":
				{
					"titre":"Le 1",
					"toto":"fpleurgh1"
				}
			},
			{
				"title":"Le Canard Enchaîné",
				"block_names": ["Au revoir"],
				"set_attributes":
				{
					"titre":"Le Canard Enchaîné",
					"toto":"fpleurgh2"
				}
			},
			{
				"title":"Le Monde Diplomatique",
				"block_names": ["Au revoir"],
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

	response.json(JSON);

});



exports.showPublications = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP montrerUne : " + JSON.stringify(request.query) );

	const BDD_chatbot = admin.database().ref();

	var lecture = BDD_chatbot.child('publications').once('value')
		.then(function(snapshot) {

			var publications = snapshot.val();

			var indexes = Object.keys(publications);

			const indexPublicationParam = request.query["indexPublication"];

			var indexPublication = parseInt(indexPublication, 10);

			if( !verifyParam(indexPublication) ) {
				badRequest(response, "Unable to find request parameter 'indexPublication'.");
				return;
			}

			if( isNaN(indexPublication) ) {
				indexPublication = 0;
			}


			const nbPublications = publications.length;
			const nbAAfficher = 3;

			var limiteAffichage, termine;
			if(indexPublication + nbAAfficher > nbPublications) {
				limiteAffichage = nbPublications;
			}
			else {
				limiteAffichage = indexPublication + nbAAfficher;
				termine = true;
			}
			console.log("limite affichage = " + limiteAffichage);

			var JSON = {};
			var JSONsetAttributes = 
			{
				"indexPublication":2,
				"termine":true
			};




			var textJSON = '';
			textJSON += '"messages": [{';
			textJSON += '"text": "';

			var quickRepliesJSON = '';
			quickRepliesJSON += ',"quick replies": [';

			for (var i = indexPublication; i < limiteAffichage; i++) {
				
				textJSON += publications[indexes[i]]['titre'] + ' - ' + publications[indexes[i]]['tags'] + '';

				quickRepliesJSON += '{"title":"' + publications[indexes[i]]['titre'] + '"';//'",';
				quickRepliesJSON += '';//'"set_attributes":{"titre":"'+ publications[indexes[i]]['titre'] + '"}';
				quickRepliesJSON += '}';
				
				if(i < limiteAffichage - 1) {
					quickRepliesJSON += ',';
				}
				//quickRepliesJSON += '"url": ' +  + ',';
				//quickRepliesJSON += '"type": json_plugin_url,';
				//quickRepliesJSON += '"block_names":["BLOCBLABLA"]';

			}
			textJSON += '"';
			quickRepliesJSON += ']';


			var reponseJSON = '{';
			reponseJSON += '"set_attributes": {';
			reponseJSON += 	'"indexPublication":' + (limiteAffichage - 1).toString() + ",";
			reponseJSON +=	'"termine":' + termine;
			reponseJSON += '},';

			reponseJSON += textJSON + quickRepliesJSON + '}]}';

			console.log(reponseJSON);

			response.json(JSON.parse(reponseJSON));

		});

		//response.end();
		
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