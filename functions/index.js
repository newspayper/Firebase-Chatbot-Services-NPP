

const functions = require('firebase-functions');

const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);


exports.enregistrerAvis = functions.https.onRequest((request, response) => {


	const BDD_chatbot = admin.database().ref();



	response.end();

});


exports.montrerUne = functions.https.onRequest((request, response) => {


	const BDD_chatbot = admin.database().ref();

	var lecture = BDD_chatbot.child('publications').once('value')
		.then(function(snapshot) {

			var publications = snapshot.val();

			console.log("Publications = " + JSON.stringify(publications));


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