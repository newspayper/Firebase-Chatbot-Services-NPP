
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);


var publicationsRef = admin.database().ref().child("publications");
var titresRef = admin.database().ref().child("titres");

const nbAAfficher = 4;

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

	//recup infos user pour log
	const messengerUserId	= request.query["messenger user id"];
	const firstName			= request.query["first name"];
	const lastName			= request.query["last name"];

	if(!verifyParam(messengerUserId)) {badRequest(response, "Unable to find request parameter 'messengerUserId'.");return;}
	//if(!verifyParam(firstName)) {badRequest(response, "Unable to find request parameter 'firstName'.");return;}
	//if(!verifyParam(lastName)) {badRequest(response, "Unable to find request parameter 'lastName'.");return;}


	var lecture = BDD_chatbot.child('publications').once('value')
		.then(function(snapshot) {

			var publications_desordre = snapshot.val();

			//console.log("pub desordre = " + JSON.stringify(publications_desordre));

			var i = 0;
			snapshot.forEach(function(childSnapshot) {
				//console.log("childSnapshot : " + JSON.stringify(childSnapshot.key));

				var date_parution = publications_desordre[childSnapshot.key].date_parution;
				var now = new Date();

				//Si déjà parue on s'en occupe
				if(date_parution < now.getTime()) {
					publications_desordre[childSnapshot.key].id = childSnapshot.key;
				}
				else { //Sinon on la retire des publications à afficher
					delete publications_desordre[childSnapshot.key];
				}

				i++;
			});

			//console.log(JSON.stringify(publications_desordre));

			var publications = Object.keys(publications_desordre)
				.sort(function(a, b) {
					return publications_desordre[b].date_parution - publications_desordre[a].date_parution; // Organize the category array
				}).map(function(category) {
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

			var logPublications = '';

			//Insertion des quick replies standard
			quickReplies.push({"title": "Menu","block_names": ["Menu"]});

			var retourArriere = limiteAffichage - nbAAfficher * 2;

			if(retourArriere >= 0)
			{
				quickReplies.push(
					{
						"title": " \ud83d\udd3c",
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
						"title": " \ud83d\udd3d",
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
			if(termine && (indexPublication >= nbPublications)) {
				texteResume = "Désolé, je n'ai plus de publications en réserve pour le moment !";
				logPublications = "N/A";
			}

			for (var i = indexPublication; i < limiteAffichage; i++) {

				texteResume += majusculify(publications[i]['titre']) + '\u000A' + publications[i]['tags'] + '\u000A' + '\u000A';
				logPublications += publications[i].id + ',';

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

			//log de l'envoi à l'utilisateur
			var now = new Date();

			var logs = {};

			logs["timestamp"] = now.getTime();
			logs["contenu_envoye"] = logPublications;

			var refUser = admin.database().ref('users').child(messengerUserId);
			
			var updates = {};
			updates["nom"] = firstName + " " + lastName;
			updates["messengerUserId"] = messengerUserId;	
			updates["/logs/" + now.getTime()] = logs;

			//console.log(JSON.stringify(updates));

			refUser.update(updates)
				.then(function() {
					response.json(reponseJSON);
				});

		});
		
});


exports.showCardPublication = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showCardPublication : " + JSON.stringify(request.query) );

	const messengerUserId	= request.query["messenger user id"];
	if(!verifyParam(messengerUserId)) {badRequest(response, "Unable to find request parameter 'messengerUserId'.");return;}
	const idPublication = request.query["publication"];
	if( !verifyParam(idPublication) ) {badRequest(response, "Unable to find request parameter 'publication'.");return;}


	var refTitre = idPublication.split('_')[0];
	var ref = titresRef.child(refTitre).child('publications');
	
	var query;
	if(undefined == idPublication.split('_')[1]){
		query = ref.orderByChild('date_parution').limitToLast(1);
	}
	else {
		query = ref.child(idPublication);
	}

	query.once('value').then(function(snapshot) {

		// console.log('snapshot => ' + JSON.stringify(snapshot));
		if(null==snapshot.val()) {
			badRequest(response, "La référence de la publication '" + idPublication + "' est erronée.");
		}
		else {

		var publication;
		if(undefined == idPublication.split('_')[1]){
			publication = snapshot.val()[Object.keys(snapshot.val())[0]];
		}
		else {
			publication = snapshot.val();
		}

			
			console.log(JSON.stringify(publication));
		
			var reponseJSON = 	
			{
				"messages": [
				{
					"attachment":{
					"type":"template",
						"payload":{
							"template_type":"generic",
							"image_aspect_ratio": "square",
							"elements":[
							{
								"title": publication.titre + " n°" + publication.numero,
								"image_url": publication.URL_couv,
								"subtitle": publication.tags,
								"buttons":[
								{
									"type":"web_url",
									"url":"https://google.fr",
									"title":"Acheter"
								},
								{
									"type":"web_url",
									"url":"https://google.fr",
									"title":"Sommaire"
								},
								{
									"type":"web_url",
									"url":"https://google.fr",
									"title":"Partager"
								}
								]
							}
							]
						}
					}
				}
				]
			};
			// console.log(JSON.stringify(reponseJSON))
			response.json(reponseJSON);
		}

	
	});


});




exports.showCouverture = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showCouverture : " + JSON.stringify(request.query) );

	const BDD_chatbot = admin.database();

	//recup infos user pour log
	const messengerUserId	= request.query["messenger user id"];

	if(!verifyParam(messengerUserId)) {badRequest(response, "Unable to find request parameter 'messengerUserId'.");return;}


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

		//log de l'envoi à l'utilisateur
		var now = new Date();

		var logs = {};

		logs["timestamp"] = now.getTime();
		logs["idPublication"] = idPublication;
		logs["contenu_envoye"] = "couverture";


		var refUser = admin.database().ref('users').child(messengerUserId);
		
		var updates = {};
		updates["messengerUserId"] = messengerUserId;	
		updates["/logs/" + now.getTime()] = logs;

		console.log("updates : " + JSON.stringify(updates));

		refUser.update(updates)
			.then(function() {
				console.log("envoi réponse JSON");
				response.json(reponseJSON);
			});

	});

});


exports.showSommaire = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showSommaire : " + JSON.stringify(request.query) );

	const BDD_chatbot = admin.database();

	//recup infos user pour log
	const messengerUserId	= request.query["messenger user id"];

	if(!verifyParam(messengerUserId)) {badRequest(response, "Unable to find request parameter 'messengerUserId'.");return;}


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

			//log de l'envoi à l'utilisateur
			var now = new Date();

			var logs = {};

			logs["timestamp"] = now.getTime();
			logs["idPublication"] = idPublication;
			logs["contenu_envoye"] = "sommaire";

			var refUser = admin.database().ref('users').child(messengerUserId);
			
			var updates = {};
			updates["messengerUserId"] = messengerUserId;	
			updates["/logs/" + now.getTime()] = logs;

			console.log("updates : " + JSON.stringify(updates));

			refUser.update(updates)
				.then(function() {
					console.log("envoi réponse JSON");
					response.json(reponseJSON);
				});
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
	//if( !verifyParam(firstName) ) {badRequest(response, "Unable to find request parameter 'firstName'.");return;}
	//if( !verifyParam(lastName) ) {badRequest(response, "Unable to find request parameter 'lastName'.");return;}
	if( !verifyParam(userAnswer) ) {
				badRequest(response, "Unable to find request parameter 'userAnswer'.");
				return;
	}
	if( !verifyParam(idPublication) ) {
				badRequest(response, "Unable to find request parameter 'publication'.");
				return;
	}


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
	//if( !verifyParam(firstName) ) {badRequest(response, "Unable to find request parameter 'firstName'.");return;}
	//if( !verifyParam(lastName) ) {badRequest(response, "Unable to find request parameter 'lastName'.");return;}
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
	
	//if( !verifyParam(firstName) ) {badRequest(response, "Unable to find request parameter 'firstName'.");return;}
	//if( !verifyParam(lastName) ) {badRequest(response, "Unable to find request parameter 'lastName'.");return;}


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



exports.logAction = functions.https.onRequest((request, response) => {


	response.end();

	console.log("chatbotNPP logAction : " + JSON.stringify(request.body) );

	const messengerUserId	= request.body["messenger user id"];
	const lastBlock	= request.body["last visited block name"];
	const lastUserInput	= request.body["last user freeform input"];
	if(!verifyParam(messengerUserId)) {badRequest(response, "Unable to find request parameter 'messengerUserId'.");return;}
	if(!verifyParam(lastBlock)) {badRequest(response, "Unable to find request parameter 'lastBlock'.");return;}
	if(!verifyParam(lastUserInput)) {badRequest(response, "Unable to find request parameter 'lastUserInput'.");return;}


	//log de l'envoi à l'utilisateur
	var now = new Date();

	var logs = {};

	logs["timestamp"] = now.getTime();
	logs["last_block"] = lastBlock;
	logs["last_input"] = lastUserInput;

	var refUser = admin.database().ref('users').child(messengerUserId);
	
	var updates = {};
	updates["messengerUserId"] = messengerUserId;	
	updates["/logs/" + now.getTime()] = logs;

	//console.log(JSON.stringify(updates));

	refUser.update(updates)
		.then(function() {
			response.end();
		});


});

function boldify(str) {

	var ts = {
		tp: [{
		        action: "acN",
		        akO: [65, 90],
		        akP: 119743
		    }, {
		        action: "acN",
		        akO: [97, 122],
		        akP: 119737
		    }, {
		        action: "acN",
		        akO: [48, 57],
		        akP: 120734
		    }]
		};
	var tfs = {
		acN: function(a, c) {
		        return a.split("").map(function(a) {
		            var t = a.charCodeAt(0);
		            return t >= c.akO[0] && t <= c.akO[1] ? c.akQ ? String.fromCodePoint(c.akQ, t + c.akP) : a = String.fromCodePoint(t + c.akP) : a
		        }).join("")
		    }
	};

	str = removeAccents(str);
	for (var i = 0; i < ts['tp'].length; i++) {

    	var action = ts['tp'][i];
	    
	    if (action) {
	      str = tfs[action.action](str, action);
	    }
  	}

	return str;
}

function removeAccents(str) {
  var accents    = 'ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž';
  var accentsOut = "AAAAAAaaaaaaOOOOOOOooooooEEEEeeeeeCcDIIIIiiiiUUUUuuuuNnSsYyyZz";
  str = str.split('');
  var strLen = str.length;
  var i, x;
  for (i = 0; i < strLen; i++) {
    if ((x = accents.indexOf(str[i])) != -1) {
      str[i] = accentsOut[x];
    }
  }
  
  str = str.join('');
  
  return str;
}

function majusculify(str) {
  
  var minAccents = "àáâãäåòóôõöøèéêëçìíîïùúûüñšÿýž";
  var majAccents = "ÀÁÂÃÄÅÒÓÔÕÖØÈÉÊËÇÌÍÎÏÙÚÛÜÑŠŸŽ"
  str = str.split('');
  var strLen = str.length;
  var i, x;
  for (i = 0; i < strLen; i++) {
    if ((x = minAccents.indexOf(str[i])) != -1) {
      str[i] = majAccents[x];
    }
  }
  
  str = str.join('');
  str = str.toUpperCase();
  
  return str;
}



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

	var JSONtest = 
	{
	 "messages": [
	    {
	     	"attachment":{
	        	"type":"template",
		        "payload":{
		          	"template_type":"generic",
			        "image_aspect_ratio": "square",
			        "elements":[
			            {
			              "title":"Chatfuel Rockets Jersey",
			              "image_url":"https://rockets.chatfuel.com/assets/shirt.jpg",
			              "subtitle":"Size: M",
			              "buttons":[
			                {
			                  "type":"web_url",
			                  "url":"https://google.fr",
			                  "title":"View Item"
			                }
			              ]
			            },
			            {
			              "title":"Chatfuel Rockets Jersey",
			              "image_url":"https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png",
			              "subtitle":"1111111111 222222222 333333333 444444444 555555555 666666666 777777777 888888888",
			              "buttons":[
			                {
			                  "type":"web_url",
			                  "url":"https://google.fr",
			                  "title":"titeul"
			                }
			              ]
			            }
			        ]
		        }
	      }
	    }
	  ]
	};

	response.json(JSONtest);

});