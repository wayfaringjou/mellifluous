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
  popularity: {
    min: 0, max: 100, value: 50, step: 1,
  },
};

// Storage for recommendations
const recommendations = {};

/* -------- Helper functions for spotify API requests -------- */

// POST request to spotify to get access token
function requestAccessToken() {
  // Define request headers
  const authHeaders = new Headers({
    Authorization: 'Basic MTdlYzc2MmQyNDY1NDFjY2E5Mzg5OTk4MTAxMTZkN2Y6NzNiMTYwZjQ0ZTQ3NDhkYmE4NDgxZWY1ZGViMTBmMGU=',
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
    .catch((error) => console.error(error.message));
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
  // Hard coded a limit of 8 results, should be enough
  const queryUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(keywordQuery)}&type=${type.join()}&limit=8`;

  return requestToApi(queryUrl)
    .catch((error) => console.error(`Received ${error.message} when searching for '${keywordQuery}'`));
}
// Request Spotify catalog information for a single 'type' using the item's Spotify id
// Returns a 'type' object (e.g. 'track', 'artist' or 'album')
function requestItemObject(itemId, type) {
  const queryUrl = `https://api.spotify.com/v1/${type}s/${itemId}`;

  return requestToApi(queryUrl)
    .catch((error) => console.error(`Received ${error.message} when trying to get catalog information for ${itemId}.`));
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
      return songAttributes;
    })
    .catch((error) => console.error(`Got ${error.message} when getting song recommendations`));
}

function requestRecommendations(seedSelectionObj, attrObj) {
  const endpoint = 'https://api.spotify.com/v1/recommendations';
  const items = { artists: [], tracks: [] };
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

  // seed_tracks(comma separated) &seed_artists(comma separated)
  // &target_(attr)
  const queryUrl = `${endpoint}?${seeds.join('&')}&${attributes.join('&')}`;

  // Return body json from query response
  return requestToApi(queryUrl)
    .catch((error) => console.error(`Got ${error.message} when getting song recommendations`));
}

/* -------- Data storage functions -------- */

// Delete an item from search results, seeds or recommendations object
function deleteStoredItem(storageObj, itemId) {
  return delete storageObj[itemId];
}
// Clear search results, seeds or recommendations object
function clearStoredObj(storageObj) {
  Object.keys(storageObj).forEach((e) => delete storageObj[e]);
}

// Store search results or recommendations
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
  const addedValuesIterator = [];
  let addedItems = 0;
  attrIterator.forEach((attr) => {
    averagedValues[attr] = 0;
  });

  storageIterator.forEach((item) => {
    if (seedSelectionStorage[item].attributes) {
      addedItems++;
      attrIterator.forEach((attr) => {
        if (seedSelectionStorage[item].attributes[attr] !== undefined) {
          averagedValues[attr] += seedSelectionStorage[item].attributes[attr];
          addedValuesIterator.push(attr);
        }
      });
    }

    addedValuesIterator.forEach((attr) => {
      const avgValue = averagedValues[attr] / addedItems;
      // 'Popularity' attribute can't be a decimal
      if (attr === 'popularity') {
        targetAttributes[attr].value = Number(`${Math.round(`${avgValue}e0`)}e-0`);
      } else if (avgValue < 0) {
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

// Store an item object in a object of seeds selected for recommendations
function storeSeedItem(itemObj, itemArticleObj) {
  const itemId = itemObj.id;
  seedSelection[itemId] = itemObj;

  if (itemObj.type === 'track') {
    requestSongAttr(itemObj.id)
      .then((attributesObj) => {
        seedSelection[itemId].attributes = attributesObj;
        // Add popularity to attributes to have it available for customization
        seedSelection[itemId].attributes.popularity = itemObj.popularity;
        return seedSelection;
      })
      .then((seedSelectionStorage) => avgAttrValues(seedSelectionStorage));
  } else {
    seedSelection[itemId].attributes = { popularity: 0 };
    seedSelection[itemId].attributes.popularity = itemObj.popularity;
    avgAttrValues(seedSelection);
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
      ? `<input type="image" src="${itemObj.album.images[0].url}" alt="'${itemObj.album.name}' album cover."  class="radius shadow"/>`
      : '<input type="image" src="images/noimage.png" alt="No image found" class="radius shadow" />';
    caption = itemObj.artists.map((e) => e.name).join(', ');
  } else {
    img = itemObj.images.length
      ? `<input type="image" src="${itemObj.images[0].url}" alt="${itemObj.name}" class="radius shadow" />`
      : '<input type="image" src="images/noimage.png" alt="No image found" class="radius shadow" />';
//    if (itemObj.genres.length) {
//      // caption = itemObj.genres.join(', ');
//      caption = itemObj.genres.map((e) => `<span class="pad-min pill primary text-300 capitalize">${e}</span>`)
//        .splice(0, 2).join('');
//    }
  }

  return `
  <li class="search-list-element width-half pad-300-left">
    <article 
    class="search-result-item image-box" 
    data-id="${itemId}" 
    data-type="${itemObj.type}">
        <section class="img-wrapper">    
          ${img}
          <div class="overlay easing-gradient-tint"></div>
        </section>
        <section class="caption pad-min">
          <a href="#">
           <h3 class="light-txt tertiary-txt-shadow text-600">${itemObj.name}</h3>
          </a>
           <h4 class="text-500 secondary-txt-shadow">${caption || ''}</h4>
        </section>
    </article>
  </li>`;
}

function generateResultsList(storageObj, generatorFunc) {
  const resultsIdsArray = Object.keys(storageObj);
  const resultsList = resultsIdsArray.map((itemId) => generatorFunc(storageObj, itemId));
  return resultsList.join('');
}

function generateRange(attrObj, attrKey) {
  return `
  <div class="flex-container width-half pad-min">
  <label for="${attrKey}" class="capitalize">${attrKey}</label>
  <input
    type="range"
    name="${attrKey}"
    id="${attrKey}"
    min="${attrObj[attrKey].min}"
    max="${attrObj[attrKey].max}"
    value="${attrObj[attrKey].value}"
    step="${attrObj[attrKey].step}"
    class="width-eight"
  />
  </div>`;
}

function generateAttributeRanges(attrObj) {
  const attrKeysArray = Object.keys(attrObj);
  const attrRanges = attrKeysArray.map((attrKey) => generateRange(targetAttributes, attrKey));

  attrRanges.unshift('<div class="flex-container-row">');
  attrRanges.unshift('<div class="flex-container">');
  attrRanges.push('</div>');

  attrRanges.push(`
  <button 
    type="submit" 
    id="customize-recommendations-submit"
    class="width-third flex-item-center gap-800-v pad-600-v pad-600-h text-600 button shadow-tertiary">
  Customize
  </button>
  </div>`);

  return attrRanges.join('');
}

function generateRecommendationArticle(storageObj, itemId) {
  const itemObj = storageObj[itemId];
  const img = itemObj.album.images.length
    ? `<img src="${itemObj.album.images[0].url}" alt="'${itemObj.album.name}' album cover." class="width-full"/>`
    : '<img src="images/noimage.png" alt="No image found" class="width-full"/>';

  return `
  <li>
   <article id="recommendation-item" class="flex-container-row card reccomendation-card">
     <section id="recommendation-album-img" class="width-forty pad-300-h card-img">
      <div class="image-box shadow">
        <div class="img-wrapper">
          ${img}
          <div class="overlay"></div>
        </div>
      </div>
     </section>
     <section id="recommendation-content" class="rows card-content width-sixty">
      <section id="recommendation-content-heading" class="">
       <h3 class="text-500">
       <a 
       href="${itemObj.external_urls.spotify}"
       target="_blank" 
       class="song-result" 
       data-song-id="${itemObj.id}">
          ${itemObj.name}
       </a>
       </h3>
      </section>
      <section id="recommendation-content-subheading" class="flex-container-row">
        <div class="rows flex-item-wrapper width-half">
          <h4 class="pad-min pill secondary text-300">Artist(s)</h4>
          <p>${itemObj.artists.map((e) => e.name).join(', ')}<p>
        </div>
        <div class="rows flex-item-wrapper width-half">
          <h4 class="pad-min pill secondary text-300">Album</h4>
          <p>${itemObj.album.name}<p>
        </div>
      </section>
      <section id="recommendation-content-description" class="">
     </section>
   </article>
  </li>`;
}

/* -------- Renderering functions -------- */

// Render found results to song query
function renderResults(storageObj, renderSectionStr, generatorFunc) {
  $(`${renderSectionStr}`).html(generateResultsList(storageObj, generatorFunc));
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

function renderSeedSelection(jQueryObj) {
  $('#seed-selection-list').append(jQueryObj);
  $('#search-results-list').empty();

  // renderAtrrValues(targetAttributes);
}

/* -------- Handlers -------- */

// Listen for song search form submission
function handleKeywordSearchSubmit() {
  $('#keyword-search').on('submit', (e) => {
    e.preventDefault();
    const keywordQuery = $(e.currentTarget).find('#keyword-search-input').val();
    const queryType = $(e.currentTarget).serializeArray()[0].value;

    requestKeywordSearch(keywordQuery, [queryType])
      .then((queryResponseJson) => storeResults(searchResults, queryResponseJson[`${queryType}s`].items))
      .then((storedResults) => {
        renderResults(storedResults, '#search-results-list', generateListArticle);
        $('#search-results').removeClass('hidden');
      });
  });
}
// Listen for a selection from the results list
function handleQueryResultClick() {
  $('#search-results-list').on('click', '.search-result-item', (e) => {
    e.preventDefault();
    $('#search-results').find('.warning').remove();
    const articleData = $(e.currentTarget).data();

    if (Object.keys(seedSelection).includes(articleData.id)) {
      $(e.currentTarget).before('<h3 class="warning">Item already selected.</h3>');
    } else if (Object.keys(seedSelection).length >= 5) {
      // Spotify's API has a limit of 5 seeds for recommendations, value hard-coded here
      $(e.currentTarget).before('<h3 class="warning">Delete one selection before adding another.</h3>');
    } else {
      $(e.currentTarget).removeClass('search-result-item');
      $(e.currentTarget).addClass('selected-item');
      $(e.currentTarget).parent().removeClass('search-list-element');
      $(e.currentTarget).parent().addClass('selected-list-element');
      $(e.currentTarget).find('.caption').find('h4').addClass('hidden');
      $(e.currentTarget).off();

      renderSeedSelection($(e.currentTarget).parent());
      $('#search-results').addClass('hidden');
      $('#seed-selection').removeClass('hidden');
      requestItemObject(articleData.id, articleData.type)
        .then((itemObj) => storeSeedItem(itemObj, $(e.currentTarget)))
        .then((seedSelectionObj) => requestRecommendations(seedSelectionObj, targetAttributes))
        .then((recommendationsObj) => storeResults(recommendations, recommendationsObj.tracks))
        .then((storedRecommendationsObj) => {
          // renderSeedSelection(seedSelection[articleData.id]);
          renderAtrrValues(targetAttributes);

          renderResults(storedRecommendationsObj, '#recommendations-results-list', generateRecommendationArticle);
          $('#recommendations').removeClass('hidden');
        });
    }
  });
}

// Listen for a click on selected items
function handleSelectedClick() {
  $('#seed-selection').on('click', '.selected-item', (e) => {
    e.preventDefault();

    $(e.currentTarget).parent().remove();
    deleteStoredItem(seedSelection, $(e.currentTarget).data().id);
    avgAttrValues(seedSelection);
    renderAtrrValues(targetAttributes);

    if (Object.keys(seedSelection).length) {
      requestRecommendations(seedSelection, targetAttributes)
        .then((recommendationsObj) => storeResults(recommendations, recommendationsObj.tracks))
        .then((storedRecommendationsObj) => {
          renderResults(storedRecommendationsObj, '#recommendations-results-list', generateRecommendationArticle);
        });
    } else {
      $('#recommendations-results-list').empty();
      $('#seed-selection').addClass('hidden');
      $('#recommendations').addClass('hidden');
    }
  });
}

// Listen for customization form submission
function handleCustomizeSubmit() {
  $('#customize-recommendations').on('submit', (e) => {
    e.preventDefault();

    $(e.currentTarget).serializeArray().forEach((i) => {
      targetAttributes[i.name].value = i.value;
    });

    requestRecommendations(seedSelection, targetAttributes)
      .then((recommendationsObj) => storeResults(recommendations, recommendationsObj.tracks))
      .then((storedRecommendationsObj) => {
        renderResults(storedRecommendationsObj, '#recommendations-results-list', generateRecommendationArticle);
      });
  });
}

// Load listeners when document is ready
function handleAppLoad() {
  // Listen to song search form submission
  handleKeywordSearchSubmit();
  // Listen to click on selected song
  handleQueryResultClick();
  handleSelectedClick();
  handleCustomizeSubmit();
}
// jQuery document ready load
$(handleAppLoad());
