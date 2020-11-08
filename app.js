'use strict';

// Storage for search results
const searchResults = {};

// Storage for selected elements for seed recommendation
const seedSelection = {};

// Storage for optional target attributes
// These are general default values
const targetAttributes = {
  acousticness: {
    min: 0.0, max: 1.0, value: 0.0, step: 0.01,
  },
  danceability: {
    min: 0.0, max: 1.0, value: 0.7, step: 0.01,
  },
  energy: {
    min: 0.0, max: 1.0, value: 0.8, step: 0.01,
  },
  instrumentalness: {
    min: 0.0, max: 1.0, value: 0.0, step: 0.01,
  },
  liveness: {
    min: 0.0, max: 1.0, value: 0.05, step: 0.01,
  },
  loudness: {
    min: -60, max: 0, value: -8, step: 1,
  },
  speechiness: {
    min: 0.0, max: 1.0, value: 0.05, step: 0.01,
  },
  valence: {
    min: 0.0, max: 1.0, value: 0.625, step: 0.01,
  },
  tempo: {
    min: 0, max: 250, value: 125, step: 1,
  },
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

function requestReccomendations(seedSelectionObj, attrObj) {
  console.log(seedSelectionObj);
  const endpoint = 'https://api.spotify.com/v1/recommendations';
  const items = { artists: [], tracks: [] };
  // Object.keys(seedSelectionObj).forEach((e) => console.log(seedSelection[e]));
  Object.keys(seedSelectionObj).forEach((e) => {
    if (seedSelectionObj[e].type === 'artist') {
      items.artists.push(seedSelectionObj[e].id);
    } else if (seedSelectionObj[e].type === 'track') {
      items.tracks.push(seedSelectionObj[e].id);
    }
  });
  const seeds = [];
  if (items.artists.length) {
    seeds.push(`seed_artists=${items.artists.join()}`);
  }

  if (items.tracks.length) {
    seeds.push(`seed_tracks=${items.tracks.join()}`);
  }
  const attributes = [];
  Object.keys(attrObj).forEach((e) => {
    attributes.push(`target_${e}=${attrObj[e].value}`);
  });
  console.log(items);
  console.log(seeds.join('&'));
  console.log(attributes.join('&'));

  // seed_tracks(comma separated) &seed_artists(comma separated)
  // &target_(attr)
  const queryUrl = `${endpoint}?${seeds.join('&')}&${attributes.join('&')}`;

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

function avgAttrValues(seedSelectionStorage) {
  const storageIterator = Object.keys(seedSelectionStorage);
  const attrIterator = Object.keys(targetAttributes);
  const averagedValues = Object.create(targetAttributes);
  let addedItems = 0;
  attrIterator.forEach((attr) => {
    averagedValues[attr] = 0;
  });

  console.log(targetAttributes);
  storageIterator.forEach((item) => {
    if (seedSelectionStorage[item].attributes) {
      addedItems++;
      attrIterator.forEach((attr) => {
        console.log(seedSelectionStorage[item].attributes[attr]);
        averagedValues[attr] += seedSelectionStorage[item].attributes[attr];
      });
    }

    attrIterator.forEach((attr) => {
      const avgValue = averagedValues[attr] / addedItems;
      if (avgValue < 0) {
        targetAttributes[attr].value = -Math.abs(
          Number(`${Math.round(`${avgValue}e4`)}e-4`),
        );
      } else {
        targetAttributes[attr].value = Number(`${Math.round(`${avgValue}e4`)}e-4`);
      }
    });
  });
  return targetAttributes;
}

// Store an item object in a object of seeds selected for reccomendations
function storeSeedItem(itemObj, itemArticleObj) {
  const itemId = itemObj.id;
  seedSelection[itemId] = itemObj;

  if (itemObj.type === 'track') {
    requestSongAttr(itemObj.id)
      .then((attributesObj) => {
        seedSelection[itemId].attributes = attributesObj;
        return seedSelection;
      })
      .then((seedSelectionStorage) => avgAttrValues(seedSelectionStorage));
  }

  seedSelection[itemId].articleObj = itemArticleObj;
  return seedSelection;
}

/* -------- Generator Functions -------- */
function generateListArticle(storageObj, itemId) {
  const itemObj = storageObj[itemId];
  let img;
  let caption;
  if (itemObj.type === 'track') {
    img = itemObj.album.images.length
      ? `<img src="${itemObj.album.images[itemObj.album.images.length - 1].url}" alt="'${itemObj.album.name}' album cover." />`
      : '<img src="" alt="No image found" />';
    caption = itemObj.artists.map((e) => e.name).join(', ');
  } else {
    img = itemObj.images.length
      ? `<img src="${itemObj.images[itemObj.images.length - 1].url}" alt="${itemObj.name}" />`
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

function generateRange(attrObj, attrKey) {
  return `
  <label for="${attrKey}">${attrKey}</label>
  <input
    type="range"
    name="${attrKey}"
    id="${attrKey}"
    min="${attrObj[attrKey].min}"
    max="${attrObj[attrKey].max}"
    value="${attrObj[attrKey].value}"
    step="${attrObj[attrKey].step}"
  />`;
}

function generateAttributeRanges(attrObj) {
  const attrKeysArray = Object.keys(attrObj);
  const attrRanges = attrKeysArray.map((attrKey) => generateRange(targetAttributes, attrKey));

  attrRanges.push(`
  <button type="submit" id="customize-recommendations-submit">
  Customize
  </button>`);

  return attrRanges.join('');
}

/* -------- Renderering functions -------- */

// Render found results to song query
function renderResults(storageObj, renderSectionStr, generatorFunc) {
  const foundItemsIdList = Object.keys(storageObj);
  console.log(foundItemsIdList);

  $(`${renderSectionStr}`).html(generatorFunc(storageObj));
}

function renderReccomendations(storedReccomendationsObj) {
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

function adjustAtrrValues(attrObj) {
  Object.keys(attrObj).forEach((attr) => {
    $(`#${attr}`).val(attrObj[attr].value);
  });
}

function renderAtrrValues(attrObj) {
  if (!$('#customize-recommendations').find('input').length) {
    $('#customize-recommendations').find('fieldset').append(generateAttributeRanges(targetAttributes));
  }
  adjustAtrrValues(attrObj);
}

function renderSeedSelection(itemObj) {
  $('#seed-selection').append(itemObj.articleObj);
  $('#search-results-list').empty();

  renderAtrrValues(targetAttributes);
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
      .then((storedResults) => renderResults(storedResults, '#search-results-list', generateResultsList));
  });
}
// Listen for a selection from the results list
function handleQueryResultClick() {
  $('#search-results-list').on('click', '.search-result-item', (e) => {
    e.preventDefault();
    console.log(e.currentTarget);
    renderSeedSelection($(e.currentTarget));
    const articleData = $(e.currentTarget).data();

    requestItemObject(articleData.id, articleData.type)
      .then((itemObj) => storeSeedItem(itemObj, $(e.currentTarget)))
      .then((seedSelectionObj) => requestReccomendations(seedSelectionObj, targetAttributes))
      .then((reccomendationsObj) => storeResults(reccomendations, reccomendationsObj.tracks))
      .then((storedReccomendationsObj) => {
        renderSeedSelection(seedSelection[articleData.id]);
        renderResults(storedReccomendationsObj, '#reccomendations-results-list', generateResultsList);
      });
  });
}
// Listen for customization form submission
function handleCustomizeSubmit() {
  $('#customize-recommendations').on('submit', (e) => {
    e.preventDefault();
    console.log($(e.currentTarget).serializeArray());

    $(e.currentTarget).serializeArray().forEach((e) => {
      targetAttributes[e.name].value = e.value;
    });

    console.log(targetAttributes);

    requestReccomendations(seedSelection, targetAttributes)
      .then((reccomendationsObj) => storeResults(reccomendations, reccomendationsObj.tracks))
      .then((storedReccomendationsObj) => {
        renderResults(storedReccomendationsObj, '#reccomendations-results-list', generateResultsList);
      });
  });
}

// Load listeners when document is ready
function handleAppLoad() {
  // Listen to song search form submission
  handleKeywordSearchSubmit();
  // Listen to click on selected song
  handleQueryResultClick();
  handleCustomizeSubmit();
}
// jQuery document ready load
$(handleAppLoad());
