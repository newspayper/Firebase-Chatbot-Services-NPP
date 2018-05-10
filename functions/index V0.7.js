
const functions = require('firebase-functions');

const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

const nbAAfficher = 5;

const notes = {
	"10084" : 2,	//emoji coeur
	"128077" : 1,	//emoji pouce vers le haut
	"85" : 0,		// le "U" de "Une autre"
	"80" : 0,		// le "P" de "Pas d'avis"
	"128078" : -1,	//emoji pouce vers le bas
	"128169" : -2,	//emoji caca
}


exports.showPublications = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showPublications : " + JSON.stringify(request.query) );

	const BDD_chatbot = admin.database().ref();


	var lecture = BDD_chatbot.child('publications').once('value')
		.then(function(snapshot) {

			var publications_desordre = snapshot.val();

			//console.log("pub desordre = " + JSON.stringify(publications_desordre));

			var i = 0;
			snapshot.forEach(function(childSnapshot) {
				//console.log("childSnapshot : " + JSON.stringify(childSnapshot.key));
				publications_desordre[childSnapshot.key].id = childSnapshot.key;
				i++;
			});

			//console.log(JSON.stringify(publications_desordre));

			var publications = Object.keys(publications_desordre)
				.sort(function(a, b) {
						return publications_desordre[b].date_parution - publications_desordre[a].date_parution; // Organize the category array
					})
					.map(function(category) {
						return publications_desordre[category]; // Convert array of categories to array of objects
					});

			//console.log("publications sorted : " + JSON.stringify(publications));

			const indexPublicationParam = request.query["indexPublication"];

			var indexPublication = parseInt(indexPublicationParam, 10);

			if( !verifyParam(indexPublication) ) {
				badRequest(response, "Unable to find request parameter 'indexPublication'.");
				return;
			}

			if( isNaN(indexPublication) ) {
				indexPublication = 0;
			}

			const nbPublications = publications.length;

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
			quickReplies.push({"title": "Menu","block_names": ["Menu"]});

			var retourArriere = limiteAffichage - nbAAfficher * 2;

			if(retourArriere >= 0)
			{
				quickReplies.push(
					{
						"title": "\u2b06",
						"block_names": ["Montre Publications"],
						"set_attributes":
						{
							"indexPublication": retourArriere
						}
					}
				);
			}

			if(!termine)
			{
				quickReplies.push(
					{
						"title": "\u2b07",
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

				texteResume += publications[i]['titre'] + ' - ' + publications[i]['tags'] + '\u000A'

				quickReplies.push(
					{
						"title": publications[i]['titre_short'],
						"block_names": ["Montre Details"],
						"set_attributes":
						{
							"publication": publications[i].id,
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
					},
					"quick_replies": [
						{
							"title": "OK"
						}
					]
				}
			]
		};

		console.log("Réponse JSON : " + JSON.stringify(reponseJSON));

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

		if(texteSommaire == undefined || texteSommaire == "" || texteSommaire.length > 2000)
		{
			console.log("Pas de sommaire à afficher");
			response.end();
		}
		else
		{
			var reponseJSON = 
			{
				"messages":[
					{
						"text": "Voici le sommaire :"
					},
					{
						"text": texteSommaire
					}
				]
			};

			console.log("Réponse JSON : " + JSON.stringify(reponseJSON));

			response.json(reponseJSON);
		}

		
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


exports.modifierAbonnement = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP modifierAbonnement : " + JSON.stringify(request.body) );

	const messengerUserId	= request.body["messenger user id"];

	const firstName			= request.body["first name"];

	const lastName			= request.body["last name"];

	const abonnement 		= request.body["abonnement"];


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
	if( !verifyParam(abonnement) ) {
				badRequest(response, "Unable to find request parameter 'abonnement'.");
				return;
	}

	var refUser = admin.database().ref('users').child(messengerUserId);
	
	var updates = {};
	updates["nom"] = firstName + " " + lastName;
	updates["messengerUserId"] = messengerUserId;	
	updates["abonne"] = abonnement;


	refUser.update(updates)
		.then(function() {
			response.end();
		});

});

exports.enregistrerAvisChatbot = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP enregistrerAvisChatbot : " + JSON.stringify(request.body) );

	const messengerUserId	= request.body["messenger user id"];

	const firstName			= request.body["first name"];

	const lastName			= request.body["last name"];

	const feedbackAvis 		= request.body["feedback: avisGeneral"];

	const feedbackComment	= request.body["feedback: commentaire"];

	const feedbackMail 		= request.body["feedback: userEmail"];

	const feedbackFan 		= request.body["feedback: fan"];


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

	var refUser = admin.database().ref('users').child(messengerUserId);

	var updates = {};
	updates["nom"] = firstName + " " + lastName;
	updates["messengerUserId"] = messengerUserId;	
	updates["/avisChatbot/" + d.getFullYear().toString() + "_" + (d.getMonth() + 1).toString() + "_" + d.getDate().toString()] = reponse;


	refUser.update(updates)
		.then(function() {
			response.end();
		});

});


function verifyParam(value) {

  if( value === undefined || value === null || value.length === 0 ) {
  	return false;
  }
  return true;

}

function badRequest(response, message) {

	console.log(message);

	response.status(400).json({ "messages": [ { "text": message } ] });

}

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
      "attachment": {
        "type": "image",
        "payload": {
          "url": "http://www.journaux.fr/images/revues/M4858_cache_s182018.jpg"
        }
      },
      "quick_replies": [
        {
          "title": "OK"
        }
      ]
    }
  ]
};

	response.json(JSONtest);

});