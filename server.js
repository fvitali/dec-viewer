/**
 * Copyright (c) 2025 Fabio Vitali
 * 
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */




// Import required libraries
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // For handling cookies
const createDatasetName = require('./datasetName.js'); // Import your dataset name generator

const FULL_CONTENT = `
	SELECT DISTINCT (IF(BOUND(?g), ?g, "<default>") AS ?graph) ?s ?p ?o
	WHERE {
  		{ GRAPH ?g { ?s ?p ?o } }
			UNION
  		{ ?s ?p ?o }
	}`;
const CLEAR_ALL = `CLEAR ALL; `;
const PORT = 3000; // Node.js server port
const FUSEKI_URL = 'http://localhost:3030'; // Base URL for Fuseki server
const doDebug = true;

const app = express();
app.use(express.json());
app.use(cors({
	origin: '*', // Allow requests from your web page
	credentials: true, // Allow cookies to be included
}));
app.use(cookieParser());
app.use(express.static('public'));

/* ---------------------------------------------------------- */
/*					Fuseki Access						   */
/* ---------------------------------------------------------- */

async function execRequest(endpoint, payload, datasetName) {
//	const uri = `${FUSEKI_URL}/dataset/${datasetName}/${endpoint}`;

	const uri = `${FUSEKI_URL}/dec/${endpoint}`;

	try {
		const response = await axios.post(uri, null, {
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			params: payload,
		});
		
		let data = typeof response.data == 'string' ? {message: response.data} : response.data ;
		return data;
	} catch (error) {
		if (error.code === 'ECONNREFUSED') {
			return { 
				status: 503,
				error: "Connection refused",			
				message: 'Fuseki server is unavailable. Please check the server status.' ,
				s: 400
			};
		} 
		return { 
			error: error.message, 
			message: error?.response?.data ,
			s: error.status
		};
	}
}

/* ---------------------------------------------------------- */
/*				  Middleware to Handle Dataset Name		 */
/* ---------------------------------------------------------- */
// Middleware to handle dataset name using cookies
app.use((req, res, next) => {
	// Check for the presence of the privateDataset cookie
	if (!req.cookies.privateDataset) {
		const datasetName = createDatasetName(); // Generate new dataset name
		res.cookie('privateDataset', datasetName, {
			httpOnly: true,
			maxAge: 30 * 60 * 1000, // 30 minutes
			sameSite: 'lax', // Prevent CSRF
			secure: false, // Set to true if using HTTPS
		});

		req.datasetName = datasetName; // Store in request
		debug({ 
			message: "Generated and set new privateDataset cookie ", 
			datasetName: req.datasetName 
		});
	} else {
		req.datasetName = req.cookies.privateDataset; // Reuse existing cookie value
		debug({ 
			message: "Reusing privateDataset cookie", 
			datasetName: req.datasetName 
		});
	}
	next();
});

/* ---------------------------------------------------------- */
/*					 POST /sparql						   */
/* ---------------------------------------------------------- */

app.post('/sparql', async (req, res) => {
	const sparqlQuery = req.body.query;
	if (!sparqlQuery) {
		return res.status(400).json({ 
			error: 'Missing SPARQL query in request body',
			message: 'No sparql parameter in request' 
		});
	}

	const response = await execRequest('sparql', { query: sparqlQuery }, req.datasetName);
	if (response.error) {
		console.error(response);
		
		return res.status(response.status || 500).json({ error: response });
	}

	res.json(response.data);
});

/* ---------------------------------------------------------- */
/*					 POST /update						   */
/* ---------------------------------------------------------- */

app.post('/update', async (req, res) => {
	const clearDataset = req.body.clearDataset;
	const sparqlUpdate = req.body.update;

	if (!sparqlUpdate) {
		return res.status(400).json(
			{ 
				error: 'Missing SPARQL update in request body',
				message: 'No update parameter in request' 
			 });
	}

	if (clearDataset) {
		const response = await execRequest('update', { update: CLEAR_ALL }, req.datasetName);
		if (response.error) {
			debug(response)
			return res.status(response.status || 500).json(response);
		}
	}

	const response = await execRequest('update', { update: sparqlUpdate }, req.datasetName);
	if (response.error) {
		debug(response)
		return res.status(response.status || 500).json(response);
	}

	const secondResponse = await execRequest('sparql', { query: FULL_CONTENT }, req.datasetName);
	if (secondResponse.error) {
		debug(secondResponse)
		return res.status(secondResponse.status || 500).json(secondResponse);
	}
	res.json(secondResponse);
});

/* ---------------------------------------------------------- */
/*					 DELETE /dataset						*/
/* ---------------------------------------------------------- */

app.delete('/dataset', async (req, res) => {
	const datasetName = req.datasetName;
	if (!datasetName) {
		return res.status(400).json({ error: 'No dataset associated with the session.' });
	}

	const uri = `${FUSEKI_URL}/dataset/${datasetName}`;
	try {
		await axios.delete(uri);
		res.clearCookie('privateDataset'); // Clear the dataset name cookie
		res.status(200).json({ message: `Dataset ${datasetName} deleted successfully` });
	} catch (error) {
		console.error('Error deleting dataset:', error.message);
		res.status(500).json({ error: 'Failed to delete dataset' });
	}
});

/* ---------------------------------------------------------- */
/*				  START SERVER							  */
/* ---------------------------------------------------------- */

app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});

function debug(message) {
	if (doDebug) {
		console.error('\n\n');
		console.error('==============================');
		console.error(message);
		console.error('==============================');
	}
}
