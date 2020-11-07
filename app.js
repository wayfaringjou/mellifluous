'use strict';

// Storage for search results
const searchResults = {};

// Storage for selected elements for seed recommendation
const seedSelection = {};

// Storage for optional target attributes
// These are general default values
const targetAttributes = {
  acousticness: 0.0,
  danceability: 0.7,
  energy: 0.8,
  instrumentalness: 0.0,
  liveness: 0.05,
  loudness: -8,
  speechiness: 0.05,
  valence: 0.625,
  tempo: 125,
};

// Storage for recommendations
const reccomendations = {};

/* -------- Helper functions for spotify API requests -------- */

// POST request to spotify to get access token
function requestAccessToken() {
  // Define request headers
  const authHeaders = new Headers({
    Authorization: 'Basic MTdlYzc2MmQyNDY1NDFjY2E5Mzg5OTk4MTAxMTZkN2Y6MTM3N2IwMjMwN2I5NDVmNmE1YjY3NDk3NDdkODVlYTU=',
    'Content-Type': 'application/x-www-form-urlencoded',
  });
  // Spotify's Api endpoint to get access token
  const authUrl = 'https://accounts.spotify.com/api/token';

  // Options for token request
  const authOptions = {
    method: 'POST',
    headers: authHeaders,
    body: 'grant_type=client_credentials',
    json: true,
  };

  // Request access token and return it
  return fetch(authUrl, authOptions)
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(`Server response: ${response.status}`);
    })
    .then((bodyJson) => bodyJson.access_token)
    .catch((error) => console.log(error.message));
}
// General options for requests to Spotify's API
function constructRequestOptions(token) {
  const queryHeaders = new Headers({
    Authorization: `Bearer ${token}`,
  });
  return {
    method: 'GET',
    headers: queryHeaders,
  };
}
// General function with request chain to get data objects from Spotify
function requestToApi(endpointUrl) {
  return requestAccessToken()
    .then((token) => constructRequestOptions(token))
    .then((reqOptions) => fetch(endpointUrl, reqOptions))
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(`Server response: ${response.status}`);
    });
}

/* -------- Spotify API request functions -------- */

// Request an item matching a string from spotify
// Takes a keyword query string and an array of query types.
// Possible types: album , artist, playlist, track, show and episode.
// Default is track and artist.
function requestKeywordSearch(keywordQuery, type = ['track', 'artist']) {
  const queryUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(keywordQuery)}&type=${type.join()}`;

  return requestToApi(queryUrl)
  // .then(response => console.log(response))
    .catch((error) => console.log(`Received ${error.message} when searching for '${keywordQuery}'`));
}
// Request Spotify catalog information for a single 'type' using the item's Spotify id
// Returns a 'type' object (e.g. 'track', 'artist' or 'album')
function requestItemObject(itemId, type) {
  const queryUrl = `https://api.spotify.com/v1/${type}s/${itemId}`;

  return requestToApi(queryUrl)
    .catch((error) => console.log(`Received ${error.message} when trying to get catalog information for ${itemId}.`));
}

function requestSongAttr(songId) {
  const queryUrl = `https://api.spotify.com/v1/audio-features/${songId}`;

  // Return attributes object
  return requestToApi(queryUrl)
    .then((bodyJson) => {
      const songAttributes = {
        acousticness: bodyJson.acousticness,
        danceability: bodyJson.danceability,
        energy: bodyJson.energy,
        instrumentalness: bodyJson.instrumentalness,
        liveness: bodyJson.liveness,
        loudness: bodyJson.loudness,
        speechiness: bodyJson.speechiness,
        valence: bodyJson.valence,
        tempo: bodyJson.tempo,
      };
      console.log(bodyJson);
      return songAttributes;
    })
    .catch((error) => console.log(`Got ${error.message} when getting song reccomendations`));
}

function requestSongReccomendation(songSelectionId, attributesObj = {
  acousticness: 0.0,
  danceability: 0.7,
  energy: 0.8,
  instrumentalness: 0.0,
  liveness: 0.05,
  loudness: -8,
  speechiness: 0.05,
  valence: 0.625,
  tempo: 125,
}) {
  const endpoint = 'https://api.spotify.com/v1/recommendations';
  console.log(attributesObj);
  const queryUrl = `${endpoint}?seed_tracks=${songSelectionId}&target_danceability=${attributesObj.danceability}`;

  console.log(queryUrl);
  // Return body json from query response
  return requestToApi(queryUrl)
    .catch((error) => console.log(`Got ${error.message} when getting song reccomendations`));
}

/* -------- Data storage functions -------- */

// Delete an item from search results, seeds or reccomendations object
function deleteStoredItem(storageObj, itemId) {
  return delete storageObj[itemId];
}
// Clear search results, seeds or reccomendations object
function clearStoredObj(storageObj) {
  Object.keys(storageObj).forEach((e) => delete storageObj[e]);
}

// Store search results or reccomendations
function storeResults(storageObj, dataArray) {
  // Clear stored keys first if there are any (does this go here?)
  if (Object.keys(storageObj).length !== 0) {
    clearStoredObj(storageObj);
  }
  // Populate storage with new data
  dataArray.forEach((e) => {
    const itemId = e.id;
    storageObj[itemId] = e;
  });
  return storageObj;
}
// Store an item object in a object of seeds selected for reccomendations
function storeSeedItem(itemObj, itemArticleObj) {
  const itemId = itemObj.id;
  seedSelection[itemId] = itemObj;

  if (itemObj.type === 'track') {
    requestSongAttr(itemObj.id)
      .then((attributesObj) => {
        seedSelection[itemId].attributes = attributesObj;
      });
  }

  seedSelection[itemId].articleObj = itemArticleObj;

  return seedSelection[itemId];
}

/* -------- Generator Functions -------- */
function generateListArticle(storageObj, itemId) {
  const itemObj = storageObj[itemId];
  let img;
  let caption;
  if (itemObj.type === 'track') {
    img = itemObj.album.images.length
      ? `<img src="${itemObj.album.images[0].url}" alt="'${itemObj.album.name}' album cover." />`
      : '<img src="" alt="No image found" />';
    caption = itemObj.artists.map((e) => e.name).join(', ');
  } else {
    img = itemObj.images.length
      ? `<img src="${itemObj.images[0].url}" alt="${itemObj.name}" />`
      : '<img src="" alt="No image found" />';
    if (itemObj.genres.length) {
      caption = itemObj.genres.join(', ');
    }
  }

  return `
  <li>
    <article class="search-result-item" data-id="${itemId}" data-type="${itemObj.type}">
      <a href="#" style="display: block; background-color: lightgray">
        <div>
           ${img}
           <h3>${itemObj.name}</h3>
           <h4>${caption || ''}</h4>
        </div>
      </a>
    </article>
  </li>`;
}

function generateResultsList(storageObj) {
  const resultsIdsArray = Object.keys(storageObj);
  const resultsList = resultsIdsArray.map((itemId) => generateListArticle(storageObj, itemId));
  return resultsList.join('');
}

/* -------- Renderering functions -------- */

// Render found results to song query
function renderResults(storageObj) {
  const foundItemsIdList = Object.keys(storageObj);
  console.log(foundItemsIdList);

  $('#search-results-list').html(generateResultsList(storageObj));
}

function displayReccomendations(reccsJson) {
  console.log(reccsJson);
  const reccSongs = reccsJson.tracks;

  $('#reccomendations-results-list').empty();

  for (let i = 0; i < reccSongs.length; i++) {
    $('#reccomendations-results-list').append(`
    <li>
    <h3>
    <a 
      href="${reccSongs[i].external_urls.spotify}" 
      class="song-result" 
      data-song-id="${reccSongs[i].id}">
    ${reccSongs[i].name}</a></h3>
    <h4>Artist(s)</h4>
    <p>${reccSongs[i].artists.map((e) => e.name).join(', ')}<p>
    <h4>Album</h4>
    <p>${reccSongs[i].album.name}<p>
    </li>`);
  }
}

function setTrackAtrr(songAttrObj) {
  $('#danceability').val(songAttrObj.danceability);
}

function renderSeedSelection(itemObj) {
  $('#seed-selection').append(itemObj.articleObj);
  $('#search-results-list').empty();
}

/* -------- Handlers -------- */

// Listen for song search form submission
function handleKeywordSearchSubmit() {
  $('#keyword-search').on('submit', (e) => {
    e.preventDefault();
    const keywordQuery = $(e.currentTarget).find('#keyword-search-input').val();
    const queryType = $(e.currentTarget).serializeArray()[1].value;

    requestKeywordSearch(keywordQuery, [queryType])
      .then((queryResponseJson) => storeResults(searchResults, queryResponseJson[`${queryType}s`].items))
      .then((storedResults) => renderResults(storedResults));
  });
}

function handleQueryResultClick() {
  $('#search-results-list').on('click', '.search-result-item', (e) => {
    e.preventDefault();
    console.log(e.currentTarget);
    renderSeedSelection($(e.currentTarget));
    const articleData = $(e.currentTarget).data();
    requestItemObject(articleData.id, articleData.type)
      .then((itemObj) => storeSeedItem(itemObj, $(e.currentTarget)))
      .then((storedSeedItem) => renderSeedSelection(storedSeedItem));
  });
}

function handleCustomizeReccsSubmit() {
  $('#customize-recommendations').on('submit', (e) => {
    e.preventDefault();
    console.log($('#search-results-list').find('.selected-song').data().id);
    console.log($(e.currentTarget).serializeArray());
    const songId = $('#search-results-list').find('.selected-song').data().id;
    //    const danceMin = $(e.currentTarget).serializeArray()[0].value;
    //    const danceMax = $(e.currentTarget).serializeArray()[1].value;

    requestSongReccomendation(songId)
      .then((reccsJson) => displayReccomendations(reccsJson));
  });
}

// Load listeners when document is ready
function handleAppLoad() {
  // Listen to song search form submission
  handleKeywordSearchSubmit();
  // Listen to click on selected song
  handleQueryResultClick();
  handleCustomizeReccsSubmit();
}
// jQuery document ready load
$(handleAppLoad());
