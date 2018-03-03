/*
* 03/03/18
* V0.1
* Les infos desvpublications proviennent désormais de la BDD et plus du fichier JSON
* 
* 01/03/18
* V0
* Première version
*/

const functions = require('firebase-functions');

const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions



exports.montrerUne = functions.https.onRequest((request, response) => {


	const BDD_chatbot = admin.database().ref();

	var toto = BDD_chatbot.once('value')
		.then(function(snapshot) {

			var donnees = snapshot.val();

			console.log("Données = " + JSON.stringify(donnees));


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


			const nbUnes = Object.keys(donnees['publications']).length;
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
								"text": donnees['publications'][uneIndex]['nom'] + ' (' + donnees['publications'][uneIndex]['date'] + ')'
							},
								{
									"attachment": {
									"type": "image",
									"payload": {
										"url": donnees['publications'][uneIndex]['url_une']
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