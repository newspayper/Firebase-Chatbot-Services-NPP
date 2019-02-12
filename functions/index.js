
//////////////////////////////////////////// INITIALISATIONS ////////////////////////////////////////////

/*** Firebase ***/
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);


var publicationsRef = admin.database().ref().child("publications");
var titresRef = admin.database().ref().child("titres");


// const refLink = "https://m.me/821278971407519"; //Chatbot de test
const refLink = "https://m.me/newspayper.fr";

const nbAAfficher = 8;

const notes = {
	"10084" : 2,	//emoji coeur
	"128077" : 1,	//emoji pouce vers le haut
	"85" : 0,		// le "U" de "Une autre"
	"80" : 0,		// le "P" de "Pas d'avis"
	"128078" : -1,	//emoji pouce vers le bas
	"128169" : -2,	//emoji caca
}


/*** Cloudinary ***/
var cloudinary = require('cloudinary');
cloudinary.config({
	cloud_name: 'newspayper',
	api_key: '783586382762585',
	api_secret: 'bkl13723ppl4FDuf4roxeLPMlyU'
});


//////////////////////////////////////////// ENDPOINTS CHATBOT ////////////////////////////////////////////


/********* Affichage chrono de la liste des publications sous forme de galerie *********/
exports.showGalerie2 = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showGalerie : " + JSON.stringify(request.query) );

	const messengerUserId	= request.query["messenger user id"];
	const firstName			= request.query["first name"];
	const lastName			= request.query["last name"];

	if(!verifyParam(messengerUserId)) {badRequest(response, "Unable to find request parameter 'messengerUserId'.");return;}

	console.log("Pré-lecture BDD");

	/*** Lecture de toutes les publications ***/
	var lecture = publicationsRef.once('value')
		.then(function(snapshot) {

			var publications_desordre = snapshot.val();

			console.log("Publications récupérées dans le désordre ; début tri");

			/*** Retrait des publications qui ne doivent pas être montrées ***/
			var i = 0;
			snapshot.forEach(function(childSnapshot) {
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

			/*** Tri des publications de la plus récente à la plus ancienne ***/
			var publications = Object.keys(publications_desordre)
				.sort(function(a, b) {
					return publications_desordre[b].date_parution - publications_desordre[a].date_parution; // Organize the category array
				}).map(function(category) {
					return publications_desordre[category]; // Convert array of categories to array of objects
				});
			console.log("Fin tri publications");


			/*** Gestion de l'index à partir duquel commencer l'affichage ***/
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

			/*** Détermination de la position de l'user : début, fin, milieu des pages ***/
			if(indexPublication + nbAAfficher > nbPublications) {
				limiteAffichage = nbPublications;
				termine = true;
			}
			else {
				limiteAffichage = indexPublication + nbAAfficher;
				termine = false;
			}

			var cards = [];
			var texteResume = '';
			var logPublications = '';

			console.log("Début constitution réponse JSON");

			//Message de fin si jamais il n'y a plus de publication à afficher
			if(termine && (indexPublication >= nbPublications)) {
				texteResume = "Désolé, je n'ai plus de publications en réserve pour le moment !";
				logPublications = "N/A";
			}

			console.log("Boucle sur les publications à rajouter dans le JSON");
			for (var i = indexPublication; i < limiteAffichage; i++) {

				var card = 
					{
						"title": publications[i].titre + " n°" + publications[i].numero,
						"image_url": publications[i].URL_couv,
						"subtitle": publications[i].tags,
						"default_action": {
							"type": "web_url",
							"url": publications[i].URL_couv
						},
						"buttons":[
						{
							"type":"show_block",
							"block_names":["Sommaire"],
							"title":"\ud83d\udcdd Sommaire",
							"set_attributes":
							{
								"publication": publications[i].id
							}
						},
						{
							"type":"show_block",
							"block_names":["Share"],
							"title":"\ud83d\udc8c Envoyer à un ami",
							"set_attributes":
							{
								"publication": publications[i].id
							}
						}
						]
					};

				//Bouton d'achat
				if(undefined!=publications[i].URL_achat && ""!=publications[i].URL_achat && " "!=publications[i].URL_achat)
				{
					card.buttons.push(
							{
								"type":"web_url",
								"url":publications[i].URL_achat,
								"title":"\ud83d\uded2 Acheter"
								// "set_attributes":
								// {
								// 	"publication": publications[i].id
								// }
								//Memo : log du click ?
							}
						);
				}

				cards.push(card);

			}

			var retourArriere = limiteAffichage - nbAAfficher * 2;

			var boutonsNavigation = [];
			var quickReplies = [];

			boutonsNavigation.push(
				{
					"type":"show_block",
					"block_names":["Menu"],
					"title":"Menu"
				}
			);

			if(retourArriere >= 0)
			{
				boutonsNavigation.push(
					{
						"type":"show_block",
						"block_names":["Galerie Chrono"],
						"title":"\ud83d\udd3c Précédent",
						"set_attributes":
						{
							"indexPublication": retourArriere
						}
					}
				);

				quickReplies.push(
					{
						"title": " \ud83d\udd3c Précédent",
						"block_names": ["Galerie Chrono"],
						"set_attributes":
						{
							"indexPublication": retourArriere
						}
					}
				);
			}

			if(!termine)
			{
				boutonsNavigation.push(
					{	
						"type":"show_block",
						"block_names":["Galerie Chrono"],
						"title":"\ud83d\udd3d Suivant",
						"set_attributes":
						{
							"indexPublication": limiteAffichage
						}
					}
				);

				quickReplies.push(
					{
						"title": " \ud83d\udd3d Suivant",
						"block_names": ["Galerie Chrono"],
						"set_attributes":
						{
							"indexPublication": limiteAffichage
						}
					}
				);
			}
			else
			{
				boutonsNavigation.push(
					{	
						"type":"show_block",
						"block_names":["Galerie Chrono"],
						"title":"\ud83d\udd3c Recommencer",
						"set_attributes":
						{
							"indexPublication": 0
						}
					}
				);

				quickReplies.push(
					{
						"title": "Recommencer",
						"block_names": ["Galerie Chrono"],
						"set_attributes":
						{
							"indexPublication": 0
						}
					}
				);
			}

			cards.push(
				{
					"title": "Navigation",
					"image_url": "https://res.cloudinary.com/newspayper/image/upload/b_rgb:474747,c_fit,e_shadow,h_970,q_90/b_rgb:00ADEF,c_lpad,h_1125,w_1125/Divers/presse_square-small.jpg",
					"subtitle": "Utiliser les options ci-dessous",
					"buttons" : boutonsNavigation
				}
			);


			var reponseJSON = {};

			reponseJSON.set_attributes = 
			{
				"termine": termine
			};

			reponseJSON.messages =
			[
				{
							"attachment":{
							"type":"template",
							"payload":{
								"template_type":"generic",
								"image_aspect_ratio": "square",
								"elements": cards
								}
							}
							,
							"quick_replies": quickReplies
				}

			];

			console.log("Réponse JSON : " + JSON.stringify(reponseJSON));

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

/********* Traitement des paramètres REF pour affichage publication *********/
exports.refParserPublication = functions.https.onRequest((request, response) => {
	
	console.log("chatbotNPP refParser : " + JSON.stringify(request.query) );

	const ref	= request.query["ref"];
	if(!verifyParam(ref)) {badRequest(response, "Unable to find request parameter 'ref'.");return;}

	var splitRef = ref.split("|");
	var friendUserId = splitRef[2];
	var friendFirstName = splitRef[3];
	var friendLastName = splitRef[4];

	var publication = splitRef[1];

	var reponseJSON = 
	{
		"set_attributes": {
			"publication": publication,
			"friendUserId": friendUserId,
			"friendFirstName": friendFirstName,
			"friendLastName": friendLastName
		}
	};

	// console.log(JSON.stringify(reponseJSON));
	response.json(reponseJSON);
});

/********* Traitement des paramètres REF pour démarrage conversation *********/
exports.refParserChatbot = functions.https.onRequest((request, response) => {
	
	console.log("chatbotNPP refParser : " + JSON.stringify(request.query) );

	const ref	= request.query["ref"];
	if(!verifyParam(ref)) {badRequest(response, "Unable to find request parameter 'ref'.");return;}


	var splitRef = ref.split("|");
	var friendUserId = splitRef[1];
	var friendFirstName = splitRef[2];
	var friendLastName = splitRef[3];

	var reponseJSON = 
	{
		"set_attributes": {
			"friendUserId": friendUserId,
			"friendFirstName": friendFirstName,
			"friendLastName": friendLastName
		}
	};

	//console.log(JSON.stringify(reponseJSON));
	response.json(reponseJSON);
});

/********* Affichage d'une publication unique *********/
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

		var publication, idPub;
		if(undefined == idPublication.split('_')[1]){
			idPub = Object.keys(snapshot.val())[0];
			publication = snapshot.val()[idPub];
		}
		else {
			publication = snapshot.val();
			idPub = idPublication;
		}
			
			// console.log(JSON.stringify(publication));
			console.log("id publication : " + idPub);
		
			var buttons = [
								{
									"type":"show_block",
									"block_names":["Sommaire"],
									"title":"\ud83d\udcdd Sommaire",
									"set_attributes":
									{
										"publication": idPub
									}
								},
								{
									"type":"show_block",
									"block_names":["Share"],
									"title":"\ud83d\udc8c Envoyer à un ami",
									"set_attributes":
									{
										"publication": idPub
									}
								}
							  ];

			if(undefined!=publication.URL_achat && ""!=publication.URL_achat && " "!=publication.URL_achat)
			{
				buttons.push(
						{
							"type":"web_url",
							"url":publication.URL_achat,
							"title":"\ud83d\uded2 Acheter"
						}
					);
			}

			//console.log(JSON.stringify(buttons));

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
								"default_action": {
									"type": "web_url",
									"url": publication.URL_couv
								},
								"buttons": buttons
							}
							]
						}
					}
				}
				]
			};
			console.log(JSON.stringify(reponseJSON))
			response.json(reponseJSON);
		}

	});
});

/********* Affichage d'une carte de partage de publication *********/
exports.shareCardPublication = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showShareCardPublication : " + JSON.stringify(request.query) );

	const messengerUserId	= request.query["messenger user id"];
	if(!verifyParam(messengerUserId)) {badRequest(response, "Unable to find request parameter 'messengerUserId'.");return;}
	const firstName = request.query["first name"];
	if(!verifyParam(messengerUserId)) {console.log("Impossible de récupérer l'attribut 'first name'");}
	const lastName = request.query["last name"];
	if(!verifyParam(messengerUserId)) {console.log("Impossible de récupérer l'attribut 'last name'");}
	const idPublication = request.query["publication"];
	if( !verifyParam(idPublication) ) {badRequest(response, "Unable to find request parameter 'publication'.");return;}


	var refTitre = idPublication.split('_')[0];
	var ref = titresRef.child(refTitre).child('publications');
	
	var query = ref.child(idPublication);

	query.once('value').then(function(snapshot) {

		if(null==snapshot.val()) {
			badRequest(response, "La référence de la publication '" + idPublication + "' est erronée.");
		}
		else {

			var publication = snapshot.val(); 	
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
								"title": "\u2705 Découvre " + publication.titre + " n°" + publication.numero + " avec Newspayper !",
								"image_url": publication.URL_couv,
								"subtitle": "Pour voir les détails, clique sur l'image ou sur le bouton ci-dessous \ud83d\udc47",
								"default_action": {
									"type": "web_url",
									"url": refLink + "?ref=sharedPublication%7C" + idPublication
											+ "%7C" + messengerUserId + "%7C" + firstName + "%7C" + lastName
              					},
								"buttons":[
								{
									"type": "web_url",
									"url": refLink + "?ref=sharedPublication%7C" + idPublication
											+ "%7C" + messengerUserId + "%7C" + firstName + "%7C" + lastName,
									"title": "\ud83d\udd0e Voir les détails"
								},
								{
									"type":"element_share"
								}
								]
							}
							]
						}
					}
				}
				]
			};
			console.log(JSON.stringify(reponseJSON))
			response.json(reponseJSON);
		}

	});
});

/********* Affichage d'une carte de partage du chatbot *********/
exports.shareChatbot = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showShareCardPublication : " + JSON.stringify(request.query) );

	const messengerUserId	= request.query["messenger user id"];
	if(!verifyParam(messengerUserId)) {badRequest(response, "Unable to find request parameter 'messengerUserId'.");return;}
	const firstName = request.query["first name"];
	if(!verifyParam(messengerUserId)) {console.log("Impossible de récupérer l'attribut 'first name'");}
	const lastName = request.query["last name"];
	if(!verifyParam(messengerUserId)) {console.log("Impossible de récupérer l'attribut 'last name'");}
		
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
						"title": "Revue de presse sur Messenger ! 💬📰",
						"image_url": "https://res.cloudinary.com/newspayper/image/upload/v1540985351/Divers/presse_square-small.jpg",
						"subtitle": "Discute avec Newspayper et découvre le meilleur de la presse ! 👇",
						"default_action": {
							"type": "web_url",
							"url": refLink + "?ref=sharedChatbot%7C" + messengerUserId + "%7C" + firstName + "%7C" + lastName
      					},
						"buttons":[
						{
							"type": "web_url",
							"url": refLink + "?ref=sharedChatbot%7C" + messengerUserId + "%7C" + firstName + "%7C" + lastName,
							"title": "Je veux essayer 🔥"
						},
						{
							"type":"element_share"
						}
						]
					}
					]
				}
			}
		}
		]
	};

	console.log(JSON.stringify(reponseJSON));
	response.json(reponseJSON);

});

/********* Affichage du sommaire d'une publication *********/
exports.showSommaire2 = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showSommaire2 : " + JSON.stringify(request.query) );

	const messengerUserId	= request.query["messenger user id"];
	if(!verifyParam(messengerUserId)) {badRequest(response, "Unable to find request parameter 'messengerUserId'.");return;}
	const idPublication = request.query["publication"];
	if( !verifyParam(idPublication) ) {badRequest(response, "Unable to find request parameter 'publication'.");return;}


	var refTitre = idPublication.split('_')[0];
	var ref = titresRef.child(refTitre).child('publications');
	
	var query = ref.child(idPublication);//.child('sommaire');

	query.once('value').then(function(snapshot) {

		var publication = snapshot.val();
		var texteSommaire = publication.sommaire;

		if(texteSommaire == undefined || texteSommaire == "" || texteSommaire.length > 2000)
		{
			console.log("Pas de sommaire à afficher");
			response.end();
		}
		else
		{
			var quick_replies = 
				[
					{
						"title": "\ud83d\udcf0 Autres titres"
					},
					{
	                    "title":"\ud83d\udc8c Partager",
	                    "block_names":[
	                        "Share"
	                    ]
	                }
				];

			var reponseJSON = 
			{
				"messages":[
					{
						"text": "Voici le sommaire :"
					},
					{
						"text": texteSommaire,
						"quick_replies": quick_replies
					
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

/********* Enregistrement des messages utilisateurs envoyés dans bloc spécifique *********/
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

/********* Log des actions utilisateur *********/
exports.logAction = functions.https.onRequest((request, response) => {


	response.end();

	/*
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
		});*/
});


//////////////////////////////////////////// ENDPOINTS CLOUDINARY ////////////////////////////////////////////

/********* Récupération du webhook envoyé par Cloudinary pour update de la BDD *********/
exports.updateFromCloudinary = functions.https.onRequest((request, response) => {

	console.log("updateFromCloudinary : " + JSON.stringify(request.body) );

	var url_image			= request.body["secure_url"];
	const id_image			= request.body["public_id"];
	const colors			= request.body["colors"];

	if( !verifyParam(url_image) ) {
				badRequest(response, "Unable to find request parameter 'url_image'.");
				return;
	}
	if( !verifyParam(id_image) ) {
				badRequest(response, "Unable to find request parameter 'id_image'.");
				return;
	}

	if(undefined!=colors[1]) {
		
		couleur = colors[1][0];

		var URL_couv = url_image.split('/');

        url_image  = "https://res.cloudinary.com/newspayper/image/upload/";
        url_image += "b_rgb:474747,c_fit,e_shadow,h_970,q_90/b_rgb:";
        url_image += couleur.substr(1);
        url_image += ",c_lpad,h_1125,w_1125/";
        url_image += URL_couv[URL_couv.length - 1];
	}

	var publication = {
		"URL_couv" : url_image
	};


	var titre = id_image.split('_')[0];
	var refTitre = titresRef.child(titre).child('publications').child(id_image);
	var refPublication = publicationsRef.child(id_image);

	console.log("url_image : " + url_image);
	console.log("id_image : " + id_image)

	if(undefined!==id_image.split('_')[1]) {

		refTitre.once('value').then(function(snapshot) {
			
			console.log(snapshot.val());
			console.log(JSON.stringify(snapshot.val()));
			if(null!==snapshot.val()) {
				refTitre.update(publication).then(function() {
					console.log("Titre mis à jour");
					refPublication.update(publication).then(function() {
						console.log("Publication mise à jour");
						response.end();
					});
				});
			}
			else {
				console.log("Impossible de retrouver le titre dans la BDD. Abandon de l'update.");
				response.end();
			}
		});
	}
	else {
		console.log("Le format de l'id ne correspond pas à ce qui est attendu. Abandon de l'update.");
		response.end();
	}
});

/********* Upload de l'image dans la BDD *********/
exports.uploadToCloudinary = functions.https.onRequest((request, response) => {

	console.log("uploadToCloudinary : " + JSON.stringify(request.body) );

	const url_image			= request.body["url_image"];
	const id_image			= request.body["id_image"];

	if( !verifyParam(url_image) ) {
				badRequest(response, "Unable to find request parameter 'url_image'.");
				return;
	}
	if( !verifyParam(id_image) ) {
				badRequest(response, "Unable to find request parameter 'id_image'.");
				return;
	}

	cloudinary.v2.uploader.upload(url_image, 
	  {resource_type: "image", public_id: id_image, colors: "true",
	  notification_url: "https://us-central1-chatbot-npp.cloudfunctions.net/updateFromCloudinary"
	  },
	  function(error, result) {
	  	console.log("result :" + JSON.stringify(result), "error :" + JSON.stringify(error));
	  	response.status(200).json({ "message": "Tout s'est bien passé" });
	  }
	);

});


//////////////////////////////////////////// FONCTIONS ////////////////////////////////////////////


/********* NON UTILISE : Mise en gras (via unicode) *********/
function boldify(str) {
// Attention, selon le programme qui les traite, les caractères gras peuvent ne pas être affichés

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

/********* Suppression des accents *********/
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

/********* Mise en majuscules *********/
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

/********* Vérification des paramètres d'une requête *********/
function verifyParam(value) {

  if( value === undefined || value === null || value.length === 0 ) {
  	return false;
  }
  return true;
}

/********* Mise en forme d'une réponse HTTP 400 *********/
function badRequest(response, message) {

	console.log(message);

	response.status(400).json({ "messages": [ { "text": message } ] });
}




//////////////////////////////////////////// TESTS ////////////////////////////////////////////


/********* Tests JSON pour Chatfuel *********/
exports.showTest = functions.https.onRequest((request, response) => {


	var quickReplies = [];
	quickReplies.push(
					{
						"title": "QR1",
						"block_names": ["Montre Details"]
					}
				);
		quickReplies.push(
					{
						"title": "QR2",
						"block_names": ["Montre Details"]
					}
				);

	var JSONtest =
	
	{
	  "messages": [
	    {
	      "attachment": {
	        "type": "template",
	        "payload": {
	          "template_type": "generic",
	          "image_aspect_ratio": "square",
	          "elements": [
	            {
	              "title": "Publications suivantes",
	              "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/330px-Google_2015_logo.svg.png",
	              "subtitle": "Sauv",
	              "default_action": {
	                "type": "show_block",
	                "block_names": [
	                  "Test"
	                ],
	                "title": "🔼",
	                "set_attributes": {
	                  "indexPublication": 8
	                }
	              },
	              "buttons": [
	                {
	                  "type": "show_block",
	                  "block_names": [
	                    "Test"
	                  ],
	                  "title": "🔼",
	                  "set_attributes": {
	                    "indexPublication": 8
	                  }
	                }
	              ]
	            }
	          ]
	        }
	      }
	    }
	  ]
	};

	var JSONtest2 = 
		{
	  	"messages": [
	    {
	      "attachment": {
	        "type": "template",
	        "payload": {
	          "template_type": "generic",
	          "image_aspect_ratio": "square",
	          "elements": [
	            {
	              "title": "Le Point n°2408",
	              "image_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/330px-Google_2015_logo.svg.png",
	              "subtitle": "Sauver la planète ·Génie de la blockchain ·Italie, l’Europe sur un volcan",
	              "default_action": {
	                "type": "web_url",
	                "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/330px-Google_2015_logo.svg.png"
	              },
	              "buttons": [
	                {
	                  "type": "show_block",
	                  "block_names": [
	                    "Sommaire"
	                  ],
	                  "title": "Sommaire",
	                  "set_attributes": {
	                    "publication": "LePoint_2408"
	                  }
	                },
	                {
	                  "type": "show_block",
	                  "block_names": [
	                    "Share"
	                  ],
	                  "title": "💌 Partager",
	                  "set_attributes": {
	                    "publication": "LePoint_2408"
	                  }
	                }
	              ]
	            }
	          ]
	        }
	      }
	    }
	  ]
	};

	var JSONtest3 = 
	{"messages":[{"attachment":{"type":"template","payload":{"template_type":"generic","image_aspect_ratio":"square","elements":[{"title":"Welcome!","subtitle":"Choose your preferences","buttons":[{"type":"web_url","url":"http://webviews-dev.us-east-2.elasticbeanstalk.com/testWebview/dynamic-webview?userId=CCCCCCC&blockName=AfterSubmit","title":"Webview (compact)","messenger_extensions":true,"webview_height_ratio":"compact"},{"type":"web_url","url":"http://webviews-dev.us-east-2.elasticbeanstalk.com/testWebview/dynamic-webview?userId=CCCCCCC&blockName=AfterSubmit","title":"Webview (tall)","messenger_extensions":true,"webview_height_ratio":"tall"},{"type":"web_url","url":"http://webviews-dev.us-east-2.elasticbeanstalk.com/testWebview/dynamic-webview?userId=CCCCCCC&blockName=AfterSubmit","title":"Webview (full)","messenger_extensions":true,"webview_height_ratio":"full"}]}]}}}]};

	console.log(JSON.stringify(JSONtest3));
	response.json(JSONtest3);
});