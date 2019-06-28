
//////////////////////////////////////////// INITIALISATIONS ////////////////////////////////////////////

/*** Firebase ***/
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);


var publicationsRef = admin.database().ref().child("publications");
var titresRef = admin.database().ref().child("titres");
var usersRef = admin.database().ref().child("users");


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


/*** Twilio demo ***/
// const MessagingResponse = require('twilio').twiml.MessagingResponse;


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

			quickReplies.push(
				{
					"title": "📋 Menu",
					"block_names": ["Menu"],
					"set_attributes":
					{
						"indexPublication": 0
					}
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

			response.json(reponseJSON);
		});
});

/********* Affichage chrono de la liste des publications favorites d'un user sous forme de galerie *********/
exports.showGalerieFav = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showGalerieFav : " + JSON.stringify(request.query) );

	const muid = request.query["messenger user id"];
	if(!verifyParam(muid)) {badRequest(response, "Unable to find request parameter 'messenger user id'.");return;}

	var galerie = [];
	var cards = [];
	var favoris_arr = [];
	
	/*** Récupération de la liste des favoris user ***/
	usersRef.child(muid).once("value").then(function(snapshotUser) {

		var user = snapshotUser.val();

		if(undefined !== user && null !== user) {
			var favoris = user.favoris;
			if(undefined !== favoris && "" !== favoris) {
				favoris_arr = favoris.split(",");
			}
		}

		/*** Récupération de toutes les publications ***/
		publicationsRef.once("value").then(function(snapshot) {

		    /*** Constitution d'un array de cards pour les publications favorites  ***/
		    snapshot.forEach(function(childSnapshot) {
		      var childKey = childSnapshot.key;
		      var childData = childSnapshot.val();
		      var now = new Date();
		      
		      for (var i = 0; i < favoris_arr.length; i++) {
		        
		        // Si la publication se trouve parmi les favoris
		        if (childKey.includes(favoris_arr[i] + "_") && childData.date_parution < now.getTime()) {
		          cards.push({
		            key: childKey,
		            URL_achat: childData.URL_achat,
		            URL_couv: childData.URL_couv,
		            date_parution: childData.date_parution,
		            numero: childData.numero,
		            sommaire: childData.sommaire,
		            tags: childData.tags,
		            titre: childData.titre,
		            titre_short: childData.titre_short
		          });
		        }
		      }
		    });

		    /*** Tri par date décroissante ***/
		    cards = cards.sort((a, b) => (a.date_parution < b.date_parution ? 1 : -1));


		    /*** Gestion de l'index à partir duquel commencer l'affichage ***/
			const indexPublicationParam = request.query["indexPublicationFav"];
			var indexPublication = parseInt(indexPublicationParam, 10);
			if( !verifyParam(indexPublication) ) {
				badRequest(response, "Unable to find request parameter 'indexPublicationFav'.");
				return;
			}
			if( isNaN(indexPublication) ) {
				indexPublication = 0;
			}

			const nbPublications = cards.length;
			var limiteAffichage, termine;

			/*** Détermination de la position de l'user : début, fin, milieu des pages ***/
			if(indexPublication + nbAAfficher > nbPublications)
			{
				limiteAffichage = nbPublications;
				termine = true;
			}
			else
			{
				limiteAffichage = indexPublication + nbAAfficher;
				termine = false;
			}

			//Message de fin si jamais il n'y a plus de publication à afficher
			if(termine && (indexPublication >= nbPublications)) {
				texteResume = "Désolé, je n'ai plus de publications en réserve pour le moment !";
			}


		    /*** Constitution de la galerie ***/
		    for (var i = indexPublication; i < limiteAffichage; i++) {
		      card = {
		        title: cards[i].titre + " n°" + cards[i].numero,
		        image_url: cards[i].URL_couv,
		        subtitle: cards[i].tags,
		        messenger_extensions: true,
		        default_action: {
		          type: "web_url",
		          url: cards[i].URL_couv
		        },
		        buttons: [
		          {
		            type: "show_block",
		            block_names: ["Sommaire"],
		            title: "\ud83d\udcdd Sommaire",
		            set_attributes: {
		              publication: cards[i].key
		            }
		          },
		          {
		            type: "show_block",
		            block_names: ["Share"],
		            title: "\ud83d\udc8c Envoyer à un ami",
		            set_attributes: {
		              publication: cards[i].key
		            }
		          }
		        ]
		      };
		      //Bouton d'achat
		      if (
		        cards[i].URL_achat != undefined &&
		        cards[i].URL_achat != "" &&
		        cards[i].URL_achat != ""
		      ) {
		        card.buttons.push({
		          type: "web_url",
		          url: cards[i].URL_achat,
		          title: "\ud83d\uded2 Acheter"
		        });
		      }

		      //Ajout de la nouvelle carte à l'array
		      galerie.push(card);
		    }



		    /*** Ajout de la card de navigation avec ses boutons ***/
		    var retourArriere = limiteAffichage - nbAAfficher * 2;
			var quickReplies = [];
			var boutonsNavigation = [];


			if(retourArriere >= 0)
			{
				boutonsNavigation.push(
					{
						type:"show_block",
						block_names:["Galerie Favoris"],
						title:"\ud83d\udd3c Précédent",
						set_attributes:
						{
							indexPublicationFav: retourArriere
						}
					}
				);

				quickReplies.push(
					{
						title: " \ud83d\udd3c Précédent",
						block_names: ["Galerie Favoris"],
						set_attributes:
						{
							indexPublicationFav: retourArriere
						}
					}
				);
			}



			if(!termine)
			{
				boutonsNavigation.push(
					{	
						type:"show_block",
						block_names:["Galerie Favoris"],
						title:"\ud83d\udd3d Suivant",
						set_attributes:
						{
							indexPublicationFav: limiteAffichage
						}
					}
				);

				quickReplies.push(
					{
						title: " \ud83d\udd3d Suivant",
						block_names: ["Galerie Favoris"],
						set_attributes:
						{
							indexPublicationFav: limiteAffichage
						}
					}
				);
			}
			else
			{
				if(nbPublications > nbAAfficher)
				{
					boutonsNavigation.push(
						{	
							type:"show_block",
							block_names:["Galerie Favoris"],
							title:"\ud83d\udd3c Recommencer",
							set_attributes:
							{
								indexPublicationFav: 0
							}
						}
					);

					quickReplies.push(
						{
							title: "Recommencer",
							block_names: ["Galerie Favoris"],
							set_attributes:
							{
								indexPublicationFav: 0
							}
						}
					);
				}
			}
		    

		    boutonsNavigation.push({
		      type: "show_block",
		      block_names: ["Gestion Favoris"],
		      title: "⭐ Gérer Favoris" //Remplacer le texte par autre chose + emojis
		    });

		    quickReplies.push(
				{
					title: "📋 Menu",
					block_names: ["Menu"],
					set_attributes:
					{
						indexPublicationFav: 0
					}
				}
			);	

		    quickReplies.push(
			{
				title: "⭐ Gérer Favoris",
				block_names: ["Gestion Favoris"],
				set_attributes:
				{
					indexPublicationFav: 0
				}
			});

		    galerie.push({
		      title: "Navigation",
		      image_url:
		        "https://res.cloudinary.com/newspayper/image/upload/b_rgb:474747,c_fit,e_shadow,h_970,q_90/b_rgb:00ADEF,c_lpad,h_1125,w_1125/Divers/presse_square-small.jpg",
		      subtitle: "Utiliser les options ci-dessous",
		      buttons: boutonsNavigation
		    });

		    /*** Constitution du JSON de la réponse ***/
		    var reponseJSON = {};

		    reponseJSON.set_attributes = 
			{
				termine: termine
			};

			reponseJSON.messages = [];

			if(favoris_arr.length == 0) {
				reponseJSON.messages.push(
				{
					text:"Tu n'as pas encore enregistré de favoris. Pourquoi ne pas le faire maintenant ?"
				}
				);
			}
			else {
				if(indexPublication==0)
				{
					reponseJSON.messages.push(
					{
						text:"Voilà les derniers numéros de tes journaux et magazines favoris ! 📰"
					}
					);
				}	
			}

			reponseJSON.messages.push(
				{
							attachment:{
							type:"template",
							payload:{
								template_type:"generic",
								image_aspect_ratio: "square",
								elements: galerie
								}
							}
							,
							quick_replies: quickReplies
				}

			);
		    
		    console.log("Réponse JSON : " + JSON.stringify(reponseJSON));

		    return response.json(reponseJSON);
	  
	  	});
	});
});

/********* Affichage du texte + boutons + QR de gestion des favoris (dont appel webview) *********/
exports.showGestionFav = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showGestionFav : " + JSON.stringify(request.query) );

	const userId = request.query["messenger user id"];
	if(!verifyParam(userId)) {badRequest(response, "Unable to find request parameter 'messenger user id'.");return;}
	const blockDestination = request.query["blockDestination"];
	if(!verifyParam(blockDestination)) {badRequest(response, "Unable to find request parameter 'blockDestination'.");return;}
	const nom = request.query["last name"];
	if(!verifyParam(nom)) {badRequest(response, "Unable to find request parameter 'last name'.");return;}
	const prenom = request.query["first name"];
	if(!verifyParam(prenom)) {badRequest(response, "Unable to find request parameter 'first name'.");return;}
	const chatbotId = request.query["chatbotId"];
	if(!verifyParam(chatbotId)) {badRequest(response, "Unable to find request parameter 'chatbotId'.");return;}
	const broadcastAPIToken = request.query["broadcastAPIToken"];
	if(!verifyParam(broadcastAPIToken)) {badRequest(response, "Unable to find request parameter 'broadcastAPIToken'.");return;}

	const frequenceFavoris = request.query["frequence_favoris"];
	if(!verifyParam(frequenceFavoris)) {badRequest(response, "Unable to find request parameter 'frequence_favoris'.");return;}

	
	/*** Constitution des éléments de la réponse JSON ***/
	var texte = `Notification des favoris : ${frequenceFavoris}`;

	var quick_replies = 
	[
		{
			title: "📑 Autres notifs",
			block_names:[
                "Menu Gestion Notifications"
            ]
		},
		{
			title: "⭐ Voir mes favoris",
			block_names:[
                "Init Favoris"
            ]
		},
		{
            title:"📋 Retour au menu",
            block_names:[
                "Menu"
            ]
        }
	];

	var displayUrl = `https://abolib.fr/Favoris/Select_Favoris?userId=${userId}&blockName=${blockDestination}&nom=${nom}&prenom=${prenom}&chatbotId=${chatbotId}&token=${broadcastAPIToken}`;

	var reponseJSON = {
		messages: [
		{
			attachment: {
				type: "template",
				payload: {
					template_type: "button",
					text: texte,
					buttons: [
					{
						type:"show_block",
						block_names:["Reglage frequence favoris"],
						title:"🔔 Régler notifs"
					},
					{
						type: "web_url",
	                    url: displayUrl,
	                    title: "⭐ Choisir favoris",
	                    messenger_extensions: true,
	                    webview_height_ratio: "tall"
					}
					]
				}
			},
			quick_replies: quick_replies
		}
		]	
	};

	console.log("Réponse JSON :\n" + JSON.stringify(reponseJSON));
	response.json(reponseJSON);
});

/********* Affichage d'un texte + bouton pour bloc Présentation chatbot *********/
exports.showGestionFavGenerique = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP showGestionFavPresentation : " + JSON.stringify(request.query) );

	const userId = request.query["messenger user id"];
	if(!verifyParam(userId)) {badRequest(response, "Unable to find request parameter 'messenger user id'.");return;}
	const blockDestination = request.query["blockDestination"];
	if(!verifyParam(blockDestination)) {badRequest(response, "Unable to find request parameter 'blockDestination'.");return;}
	const nom = request.query["last name"];
	if(!verifyParam(nom)) {badRequest(response, "Unable to find request parameter 'last name'.");return;}
	const prenom = request.query["first name"];
	if(!verifyParam(prenom)) {badRequest(response, "Unable to find request parameter 'first name'.");return;}
	const chatbotId = request.query["chatbotId"];
	if(!verifyParam(chatbotId)) {badRequest(response, "Unable to find request parameter 'chatbotId'.");return;}
	const broadcastAPIToken = request.query["broadcastAPIToken"];
	if(!verifyParam(broadcastAPIToken)) {badRequest(response, "Unable to find request parameter 'broadcastAPIToken'.");return;}

	const frequenceFavoris = request.query["frequence_favoris"];
	if(!verifyParam(frequenceFavoris)) {badRequest(response, "Unable to find request parameter 'frequence_favoris'.");return;}

	const texte_favoris = request.query["texte_favoris"];
	if(!verifyParam(texte_favoris)) {badRequest(response, "Unable to find request parameter 'texte_favoris'.");return;}


	var displayUrl = `https://abolib.fr/Favoris/Select_Favoris?userId=${userId}&blockName=${blockDestination}&nom=${nom}&prenom=${prenom}&chatbotId=${chatbotId}&token=${broadcastAPIToken}`;

	var texte = texte_favoris;

	var reponseJSON = {
		messages: [
		{
			attachment: {
				type: "template",
				payload: {
					template_type: "button",
					text: texte,
					buttons: [
					{
						type: "web_url",
	                    url: displayUrl,
	                    title: "⭐ Choisir favoris",
	                    messenger_extensions: true,
	                    webview_height_ratio: "tall"
					}
					]
				}
			}
		}
		]	
	};


	if(frequenceFavoris === "not set")
	{
		var set_attributes = {
			frequence_favoris: "Dès leur sortie"
		};

		reponseJSON.set_attributes = set_attributes;
	}

	console.log("Réponse JSON :\n" + JSON.stringify(reponseJSON));
	response.json(reponseJSON);
});

/********* Broadcast des favoris *********/
exports.broadcastFav = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP broadcastFav : " + JSON.stringify(request.query) );

	const muid = request.query["messenger user id"];
	if(!verifyParam(muid)) {badRequest(response, "Unable to find request parameter 'messenger user id'.");return;}
	const timezone = request.query["timezone"];
	if(!verifyParam(timezone)) {badRequest(response, "Unable to find request parameter 'timezone'.");return;}
	// const fn = request.query["first name"];
	// const ln = request.query["last name"];

	var favoris_sortis = [];
	var favoris_arr = [];
	
	/*** Récupération de la liste des favoris user ***/
	usersRef.child(muid).once("value").then(function(snapshotUser) {

		var user = snapshotUser.val();

		// console.log("user = " + JSON.stringify(user));

		if(undefined !== user && null !== user) {
			var favoris = user.favoris;
			if(undefined !== favoris && "" !== favoris) {
				// console.log("favoris " + fn + " " + ln + " = " + favoris);
				favoris_arr = favoris.split(",");
			}
		}

		var today = new Date();

		//Modification de la date pour prendre en compte le fuseau horaire
		today.setHours(today.getHours()-timezone)
      	//Mise à 0 des H/min/s/ms tout en décalant l'heure pour prendre en compte le décalage lié au fait
      	//que le Dashboard est en GMT+2
      	today.setHours(-2,0,0,0);


		/*** Récupération de toutes les publications ***/
		publicationsRef.once("value").then(function(snapshot) {

			console.log("Lecture des publications")
		    /*** Constitution d'un array de cards pour les publications favorites  ***/
		    snapshot.forEach(function(childSnapshot) {
		      var childKey = childSnapshot.key;
		      var childData = childSnapshot.val();
		      for (var i = 0; i < favoris_arr.length; i++) {

		      	//Nouvelle alerte à prévoir si la date de notif est aujourd'hui + si date de parution déjà passée ou aujourd'hui
		      	var newPublication = childData.date_notif_favoris === today.getTime() && today.getTime()>=childData.date_parution;
		      	// !!!!!!! Ici : vérification du fait que la publication soit "nouvelle", donc potentiellement à afficher si elle est dans les favoris du user

		      	// if(childKey.includes("Courrier")){
		      	// console.log("newpublication key= " + childKey + " | newPub= " + newPublication);
		      	// console.log("newpublication today= " + today.getTime() + " | date_parution= " + childData.date_parution + " | date_notif_favoris= " + childData.date_notif_favoris);
		      	// }

		        // Si la publication se trouve parmi les favoris
		        if (childKey.includes(favoris_arr[i] + "_") && newPublication) {

		        	// console.log("La nouvelle publication : " + childKey + " contient " + favoris_arr[i]);
		        	favoris_sortis.push({
		        		titre: childData.titre,
		        		date_parution: childData.date_parution
		        	});
		        	//console.log("Titre ajouté à la liste des favoris sortis aujourd'hui.")
		        }
		        // else {
		        // 	if(childKey.includes("LePoint")){
		        // 	console.log("La nouvelle publication : " + childKey + " ne contient pas " + favoris_arr[i]);
		        // }}

		      }
		    });

		    // console.log("favoris_sortis " + fn + " " + ln + " = " + JSON.stringify(favoris_sortis));

		    /*** Tri par date décroissante ***/
		    favoris_sortis = favoris_sortis.sort((a, b) => (a.date_parution < b.date_parution ? 1 : -1));

		    var reponseJSON = {};

		    var text = "";

		    if(favoris_sortis.length > 0 && user !== undefined && user !== null)
		    {

		    	//Variation du message d'update
			    var random_selector = Math.floor(Math.random() * Math.floor(3));

			    if(random_selector==0)
			    {
			    	text = "Bonjour " + user.prenom + ",\n";
			    	text += "J'ai du nouveau pour toi : ";
			    }
			    if(random_selector==1)
			    {
			    	text = "Bonjour " + user.prenom + ",\n";
			    	text += "Voilà quelque chose qui devrait t'intéresser : ";
			    }
			    if(random_selector==2)
			    {
			    	text = user.prenom + " !\n";
			    	text += "Viens vite voir ça : ";
			    }

			    //Texte commun à tous les messages
		    	if(favoris_sortis.length == 1){
		    		text += favoris_sortis[0].titre + " est sorti !";
		    	}
		    	if(favoris_sortis.length == 2){
		    		text += favoris_sortis[0].titre + " et " + favoris_sortis[1].titre + " sont sortis !";
		    	}
		    	if(favoris_sortis.length == 3){
		    		text += favoris_sortis[0].titre + ", " + favoris_sortis[1].titre + " et " + favoris_sortis[2].titre + " sont sortis !";
		    	}
		    	if(favoris_sortis.length > 3){
		    		text += favoris_sortis[0].titre + ", " + favoris_sortis[1].titre + ", " + favoris_sortis[2].titre + " et d'autres sont sortis !";
		    	}

		    	text += "\nTu veux y jeter un oeil ?"

			    var quickReplies = [];

				quickReplies.push(
					{
						title: " 📰 Allons voir !",
						block_names: ["Init Favoris"]
					}
				);

				quickReplies.push(
					{
						title: " \u23f0 Plus tard",
						block_names: ["Plus tard broadcast favoris"]
					}
				);

				quickReplies.push(
					{
						title: " 🛠️ Régler notifs",
						block_names: ["Gestion Favoris"]
					}
				);

				quickReplies.push(
					{
						title: " 📰 Autres sorties",
						block_names: ["Init Chrono"]
					}
				);

				var message = {
					text: text,
					quick_replies: quickReplies
				}
				reponseJSON.messages = [];
				reponseJSON.messages.push(message);

		    }

		    //pour ne pas avoir un message vide
			var set_attributes = {
				record_type: ""
			};


			reponseJSON.set_attributes = set_attributes;


		    console.log("Réponse JSON : " + JSON.stringify(reponseJSON));

		    return response.json(reponseJSON);
	  
	  	});
	});
});

/********* Sauvegarde dans un attribut le fait que l'user ait ou non réglé des favoris *********/
exports.saveAttributeFav = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP saveAttributeFav : " + JSON.stringify(request.query) );

	const muid = request.query["messenger user id"];
	if(!verifyParam(muid)) {badRequest(response, "Unable to find request parameter 'messenger user id'.");return;}
	
	var hasFavorites = false;


	/*** Récupération de la liste des favoris user ***/
	usersRef.child(muid).once("value").then(function(snapshotUser) {

		var user = snapshotUser.val();

		if(undefined !== user && null !== user) {
			var favoris = user.favoris;
			if(undefined !== favoris && "" !== favoris) {
				
				hasFavorites = true;

			}

		}
		

		    /*** Constitution du JSON de la réponse ***/
		    var reponseJSON = {};

		    reponseJSON.set_attributes = 
			{
				has_favorites: hasFavorites
			};

		    
		    console.log("Réponse JSON : " + JSON.stringify(reponseJSON));

		    return response.json(reponseJSON);
	  
	});
});

/********* Ajout d'un ou de plusieurs favoris *********/
exports.ajoutFavoris = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP ajoutFavoris : " + JSON.stringify(request.query) );

	const muid = request.query["messenger user id"];
	if(!verifyParam(muid)) {badRequest(response, "Unable to find request parameter 'messenger user id'.");return;}
	const idFavoris = request.query["idFavoris"];
	if(!verifyParam(idFavoris)) {badRequest(response, "Unable to find request parameter 'idFavoris'.");return;}

	if(idFavoris === "")
		response.end();
	
	/*** Récupération de la liste des favoris user ***/
	usersRef.child(muid).once("value").then(function(snapshotUser) {

		var user = snapshotUser.val();

		var favoris;
		var favoris_arr = [];

		if(undefined !== user && null !== user) {
			favoris = user.favoris;
			// console.log("Favoris : " + favoris);
			if(undefined !== favoris && "" !== favoris) {
				favoris_arr = favoris.split(",");
			}
		}

		var favorisAjout_arr = idFavoris.split(",");

		for(var i = favorisAjout_arr.length - 1; i >= 0; i--) {

			function isFavori(element) {
				return element === favorisAjout_arr[i];
			}

			var trouve = favoris_arr.findIndex(isFavori);

			// console.log("Résultat recherche élément " + favorisAjout_arr[i] + " => en position : " + trouve);
			if(trouve === -1)
			{
				favoris += "," + favorisAjout_arr[i];
			}
		}

		// console.log(favoris);

		var refUser = admin.database().ref('users').child(muid);

		refUser.update({favoris: favoris})
			.then(function() {
				var set_attributes = {idFavoris: ""};
				reponseJSON.set_attributes = set_attributes;
			    console.log("Réponse JSON : " + JSON.stringify(reponseJSON));
			    return response.json(reponseJSON);
			});
	});
});

/********* Suppression d'un ou de plusieurs favoris *********/
exports.suppressionFavoris = functions.https.onRequest((request, response) => {

	console.log("chatbotNPP suppressionFavoris : " + JSON.stringify(request.query) );

	const muid = request.query["messenger user id"];
	if(!verifyParam(muid)) {badRequest(response, "Unable to find request parameter 'messenger user id'.");return;}
	const idFavoris = request.query["idFavoris"];
	if(!verifyParam(idFavoris)) {badRequest(response, "Unable to find request parameter 'idFavoris'.");return;}

	if(idFavoris === "")
		response.end();
	
	/*** Récupération de la liste des favoris user ***/
	usersRef.child(muid).once("value").then(function(snapshotUser) {

		var user = snapshotUser.val();

		var favoris;
		var favoris_arr = [];

		if(undefined !== user && null !== user) {
			favoris = user.favoris;
			// console.log("Favoris : " + favoris);
			if(undefined !== favoris && "" !== favoris) {
				favoris_arr = favoris.split(",");
			}
		}

		var favorisSuppr_arr = idFavoris.split(",");

		for(var i = favorisSuppr_arr.length - 1; i >= 0; i--) {

			function isFavori(element) {
				return element === favorisSuppr_arr[i];
			}

			var trouve = favoris_arr.findIndex(isFavori);

			// console.log("Résultat recherche élément " + favorisAjout_arr[i] + " => en position : " + trouve);
			if(trouve !== -1)
			{
				favoris_arr.splice(trouve,1);
			}
		}

		favoris = favoris_arr.join(",")

		// console.log("Résultat = " + favoris);

		var refUser = admin.database().ref('users').child(muid);

		refUser.update({favoris: favoris})
			.then(function() {
				var set_attributes = {idFavoris: ""};
				reponseJSON.set_attributes = set_attributes;
			    console.log("Réponse JSON : " + JSON.stringify(reponseJSON));
			    return response.json(reponseJSON);
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
						title: "\ud83d\udcf0 Autres titres"
					},
					{
	                    title:"\ud83d\udc8c Partager",
	                    block_names:[
	                        "Share"
	                    ]
	                },
	                {
	                	title: "📋 Menu",
	                	block_names:[
	                		"Menu"
	                	]
	                }
				];

			var reponseJSON = 
			{
				messages:[
					{
						text: publication.titre + " n°" + publication.numero + " :"
					},
					{
						text: texteSommaire,
						quick_replies: quick_replies
					
					}
				]
			};


			var temp = 
			{
				messages: [
				{
					text: publication.titre + " n°" + publication.numero + " :"
				},
				{
					attachment: {
						type: "template",
						payload: {
							template_type: "button",
							text: texteSommaire,
							buttons: [
							{
								type:"web_url",
								url:publication.URL_achat,
								title:"\ud83d\uded2 Acheter"
							}
							]
						}
					},
					quick_replies: quick_replies
				}
				]
			};


			//

			console.log("Réponse JSON : " + JSON.stringify(reponseJSON));

			response.json(reponseJSON);

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

/********* Recopie d'attributs dans d'autres pour contourner bug Chatfuel *********/
exports.recopieAttributs = functions.https.onRequest((request, response) => {
	
	console.log("chatbotNPP recopieAttributs : " + JSON.stringify(request.query) );

	const muid	= request.query["messenger user id"];
	if(!verifyParam(muid)) {badRequest(response, "Unable to find request parameter 'messenger user id'.");return;}
	const firstName	= request.query["first name"];
	if(!verifyParam(firstName)) {badRequest(response, "Unable to find request parameter 'first name'.");return;}
	const lastName	= request.query["last name"];
	if(!verifyParam(lastName)) {badRequest(response, "Unable to find request parameter 'last name'.");return;}
	const lastVisitedBlockName	= request.query["last visited block name"];
	if(!verifyParam(lastVisitedBlockName)) {badRequest(response, "Unable to find request parameter 'last visited block name'.");return;}

	var reponseJSON = 
	{
		"set_attributes": {
			"messenger_user_id": muid,
			"first_name": firstName,
			"last_name": lastName,
			"last_visited_block_name": lastVisitedBlockName
		}
	};

	console.log(JSON.stringify(reponseJSON));
	response.json(reponseJSON);
});


exports.XMLdemoresponse = functions.https.onRequest((request, response) => {
	
	console.log("chatbotNPP XMLdemoresponse : " + JSON.stringify(request.body) );

	const userMsg	= request.body["Body"];
	console.log("User message : " + userMsg);



	var xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';

	if(userMsg === "news" || userMsg === 'News') {

		xmlString += '<Message>\n';

		xmlString += '<Body>\n';

		xmlString += '*Essai Ford Mondeo SW Hybrid*\n';
		xmlString += 'Un break hybride essence à considérer\n\n';
		xmlString += "Lancée en 2015 en carrosserie quatre portes, la Mondeo hybride s'associe au break SW à l'occasion de son restylage. De quoi réparer le principal défaut de la Mondeo Hybrid 187 ch..."
		xmlString += '\n\nhttps://www.largus.fr/actualite-automobile/essai-ford-mondeo-sw-hybrid-un-break-hybride-essence-a-considerer-9834393.html\n';

		xmlString += '</Body>\n'

		xmlString += '<Media>https://www.largus.fr/images/images/essai-ford-mondeo-sw-hybride-vignale-2019-23.jpg</Media>\n';

		xmlString += '</Message>';

	}
	else if(userMsg === 'demo' || userMsg === 'Demo') {

		xmlString += '<Message><Body>';

		xmlString += 'Démo : <br/><br/>';
		xmlString += 'This is \n*bold**<br/>';
		xmlString += 'Th\n\nis is _italic_';
		xmlString += '  https://google.fr/';

		xmlString += '</Body></Message>';
	
	}
	else {
		xmlString += '<Message><Body>';

		xmlString += "Désolé je ne comprends pas. Si vous souhaitez avoir les news, envoyez-moi 'news'";

		xmlString += '</Body></Message>';
	}

	// const res = new MessagingResponse();
	// const msg = res.message();
	// msg.body('Ceci est le message');

	//ou bien :
	//res.message('Ceci est le message');
	
	
	xmlString += '</Response>';

        response
          .set("Content-Type", "text/xml; charset=utf8")
          .status(200)
          .send(xmlString);
	
    console.log("Réponse XML = " + xmlString);

	// response = res;
	response.send();
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

	var sommaire = "🙋 Climat : rencontre avec une génération naissante Dans le sillage de la Suédoise Greta Thunberg, des milliers de jeunes s’organisent pour contraindre les gouvernements à agir contre le dérèglement climatique. A la veille de la grève scolaire mondiale du 15 mars, retour sur une mobilisation inédite. 🎵 Les maux  de Keren Ann Sur Bleue, son nouvel album en français, la chanteuse et musicienne met à nu ses tourments amoureux avec la délicatesse sonore qui la caractérise.";
	sommaire = sommaire + sommaire;

	var JSONtest4 =
	{
		"messages":
		[
		{
			"text":"Assen !\nViens vite voir ça : Le Point est sorti !\nTu veux y jeter un oeil ?",
			"quick_replies":
			[
			{
				"title":" 📰 Allons voir !",
				"block_names":["Init Favoris"]
			},
			{
				"title":" ⏰ Plus tard",
				"block_names":["Plus tard broadcast favoris"]
			},
			{
				"title":" 🛠️ Régler notifs",
				"block_names":["Gestion Favoris"]
			},
			{
				"title":" 📰 Autres sorties",
				"block_names":["Init Chrono"]
			}
			]
		}
		],
		"set_attributes":{"record_type":""}
	};



	console.log(JSON.stringify(JSONtest4));
	response.json(JSONtest4);
});