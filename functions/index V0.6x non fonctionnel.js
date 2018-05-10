
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


exports.showPublications = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showPublications : " + JSON.stringify(request.query) );

	const BDD_chatbot = admin.database().ref();

	var lecture = BDD_chatbot.child('publications').orderByChild('date_parution').once('value')
		.then(function(snapshot) {

			/*
			var publications_desordre = snapshot.val();

			console.log(JSON.stringify(publications_desordre));

			var publications = {};

			publications = sortObject(publications_desordre);
			*/
			snapshot.forEach(function(childSnapshot) {
				console.log("childSnapshot : " + JSON.stringify(childSnapshot.val()));
			});

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
			quickReplies.push({"title": "Stop","block_names": ["Menu"]});

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


function sortObject(o) {
    var sorted = {},
    key, a = [];

    for (key in o) {
        if (o.hasOwnProperty(key)) {
        	var innerObj = {};
            innerObj[key] = o[key];
            a.push(innerObj);
            //a.push(o[key]);
        }
    }

    console.log("unsorted : " + JSON.stringify(a));

    a.sort(function(x,y){

		var compareArgumentA = Date.parse(x["date_publication"]);
		var compareArgumentB = Date.parse(y["date_publication"]);

		var result = 0;// initialize return value and then do the comparison : 3 cases
		if(compareArgumentA == compareArgumentB ){return result }; // if equal return 0
		if(compareArgumentA < compareArgumentB ){result = 1 ; return result }; // if A<B return 1
		if(compareArgumentA > compareArgumentB ){result = -1 ; return result }; // if A>B return -1
    });

    console.log("sorted : " + JSON.stringify(a));

    for (key = 0; key < a.length; key++) {
        sorted[a[key]] = o[a[key]];
    }

    console.log("objet sorted : " + JSON.stringify(sorted))
    return sorted;
}

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

		console.log("Réponse JSON : " + reponseJSON);

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

		if(texteSommaire == undefined)
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

			console.log("Réponse JSON : " + reponseJSON);

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