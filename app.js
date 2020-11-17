'use strict';

// Storage for search results
const searchResults = {};

// Storage for selected elements for seed recommendation
const seedSelection = {};

// Storage for optional target attributes
// These are general default values
const targetAttributes = {
  acousticness: {
    min: 0.0, max: 1.0, value: 0.0, step: 0.01, description: 'Electric or acoustic.',
  },
  danceability: {
    min: 0.0, max: 1.0, value: 0.7, step: 0.01, description: 'Undanceable or disco.',
  },
  energy: {
    min: 0.0, max: 1.0, value: 0.8, step: 0.01, description: 'Bach prelude or Death Metal',
  },
  instrumentalness: {
    min: 0.0, max: 1.0, value: 0.0, step: 0.01, description: 'Wordy or no vocals.',
  },
  liveness: {
    min: 0.0, max: 1.0, value: 0.05, step: 0.01, description: 'Studio or concert.',
  },
  loudness: {
    min: -60, max: 0, value: -8, step: 1, description: 'Quiet tune or up to eleven.',
  },
  speechiness: {
    min: 0.0, max: 1.0, value: 0.05, step: 0.01, description: 'Non-speech or podcast.',
  },
  valence: {
    min: 0.0, max: 1.0, value: 0.625, step: 0.01, description: 'Sad or happy mood.',
  },
  tempo: {
    min: 0, max: 250, value: 125, step: 1, description: 'Slow or fast.',
  },
  popularity: {
    min: 0, max: 100, value: 50, step: 1, description: 'Gigs at bars or Legends.',
  },
};

// Storage for recommendations
const recommendations = {};

/* -------- Display error messages -------- */
function renderError(errorMessage) {
  $('.error-msg-container').slideDown('fast');
  $('.error-msg-container').html(`<h3 role="alert">${errorMessage}</h3>`);
  $('.error-msg-container').delay('2000').slideUp('fast');
}

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
    .catch((error) => renderError(error.message));
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
    .catch((error) => renderError(`Received ${error.message} when searching for '${keywordQuery}'`));
}
// Request Spotify catalog information for a single 'type' using the item's Spotify id
// Returns a 'type' object (e.g. 'track', 'artist' or 'album')
function requestItemObject(itemId, type) {
  const queryUrl = `https://api.spotify.com/v1/${type}s/${itemId}`;

  return requestToApi(queryUrl)
    .catch((error) => renderError(`Received ${error.message} when trying to get catalog information for ${itemId}.`));
}
// Request Spotify track features by id
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
    .catch((error) => renderError(`Got ${error.message} when getting song recommendations`));
}
// Request recommendations from spotify using seeds and attributes
function requestRecommendations(seedSelectionObj, attrObj) {
  const endpoint = 'https://api.spotify.com/v1/recommendations';
  const items = { artists: [], tracks: [] };
  const limit = 30;
  // Sort seeds between artists and tracks
  Object.keys(seedSelectionObj).forEach((e) => {
    if (seedSelectionObj[e].type === 'artist') {
      items.artists.push(seedSelectionObj[e].id);
    } else if (seedSelectionObj[e].type === 'track') {
      items.tracks.push(seedSelectionObj[e].id);
    }
  });
  // Generate comma separated parameter string for each seed type
  const seeds = [];
  if (items.artists.length) {
    seeds.push(`seed_artists=${items.artists.join()}`);
  }

  if (items.tracks.length) {
    seeds.push(`seed_tracks=${items.tracks.join()}`);
  }
  // Generate a parameter string for each attribute
  const attributes = [];
  Object.keys(attrObj).forEach((e) => {
    attributes.push(`target_${e}=${attrObj[e].value}`);
  });

  // Construct query joining all parameters
  const queryUrl = `${endpoint}?limit=${limit}&${seeds.join('&')}&${attributes.join('&')}`;

  // Return body json from query response
  return requestToApi(queryUrl)
    .catch((error) => renderError(`Got ${error.message} when getting song recommendations`));
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
  // Clear stored keys first if there are any
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
// Average the values stored for each attribute using the values of seeds selected by user
function avgAttrValues(seedSelectionStorage) {
  // Use array of keys to iterate through objects
  const storageIterator = Object.keys(seedSelectionStorage);
  const attrIterator = Object.keys(targetAttributes);
  // Create an object based on the targetAttributes model as temporary storage for averaged values
  const averagedValues = Object.create(targetAttributes);
  // Only available values are used for the average
  const addedValuesIterator = [];
  // Set counter for division
  let addedItems = 0;
  // Populate with zero values
  attrIterator.forEach((attr) => {
    averagedValues[attr] = 0;
  });
  // Iterate through all seeds selected by user and stored
  storageIterator.forEach((item) => {
    // If the seed has an attributes property
    if (seedSelectionStorage[item].attributes) {
      addedItems++;
      // Go through each attribute and add values that are defined
      attrIterator.forEach((attr) => {
        if (seedSelectionStorage[item].attributes[attr] !== undefined) {
          averagedValues[attr] += seedSelectionStorage[item].attributes[attr];
          addedValuesIterator.push(attr);
        }
      });
    }
    // Iterate through every attribute that has been used for the sum
    addedValuesIterator.forEach((attr) => {
      const avgValue = averagedValues[attr] / addedItems;
      // Round all values
      // 'Popularity' attribute can't be a decimal
      if (attr === 'popularity') {
        targetAttributes[attr].value = Number(`${Math.round(`${avgValue}e0`)}e-0`);
      // 'Loudness' attribute uses negative values, change to positive before rounding
      } else if (avgValue < 0) {
        targetAttributes[attr].value = -Math.abs(
          Number(`${Math.round(`${avgValue}e4`)}e-4`),
        );
      // Round to 4 decimal spaces
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
  // Request attributes for tracks
  if (itemObj.type === 'track') {
    requestSongAttr(itemObj.id)
      .then((attributesObj) => {
        seedSelection[itemId].attributes = attributesObj;
        // Add popularity to attributes to have it available for customization
        seedSelection[itemId].attributes.popularity = itemObj.popularity;
        return seedSelection;
      })
      .then((seedSelectionStorage) => avgAttrValues(seedSelectionStorage));
  // Artist only have a popularity attribute
  } else {
    seedSelection[itemId].attributes = { popularity: 0 };
    seedSelection[itemId].attributes.popularity = itemObj.popularity;
    avgAttrValues(seedSelection);
  }
  // Store selected seed item using it's id as key
  seedSelection[itemId].articleObj = itemArticleObj;
  return seedSelection;
}

/* -------- Generator Functions -------- */
// Generate a list element for search results list
function generateListArticle(storageObj, itemId) {
  const itemObj = storageObj[itemId];
  let img;
  let caption;
  if (itemObj.type === 'track') {
    img = itemObj.album.images.length
      ? `<input type="image" src="${itemObj.album.images[0].url}" alt="'${itemObj.album.name}'. Album cover."  class="radius shadow"/>`
      : '<input type="image" src="images/noimage.png" alt="No image found." class="radius shadow" />';
    const captionTxt = itemObj.artists.map((e) => e.name).join(', ');
    caption = `<h4 class="light-txt text-500 dark-txt-shadow">${captionTxt}</h4>`;
  } else {
    img = itemObj.images.length
      ? `<input type="image" src="${itemObj.images[0].url}" alt="${itemObj.name}." class="radius shadow" />`
      : '<input type="image" src="images/noimage.png" alt="No image found." class="radius shadow" />';
  }

  return `
  <li class="search-list-element width-half mq-m-width-fifth pad-300-left">
    <article 
    class="search-result-item image-box" 
    data-id="${itemId}" 
    data-type="${itemObj.type}">
        <section class="img-wrapper">    
          ${img}
          <div class="overlay easing-gradient-tint"></div>
        </section>
        <section class="caption pad-min rows">
        
           <h3 class="light-txt dark-txt-shadow text-700">${itemObj.name}</h3>
          ${caption || ''}
        </section>
    </article>
  </li>`;
}
// Compose the list html
// This function takes a generator function that should be used to construct the list's elements
// This is used for the search results and the recommendations list
function generateResultsList(storageObj, generatorFunc) {
  const resultsIdsArray = Object.keys(storageObj);
  const resultsList = resultsIdsArray.map((itemId) => generatorFunc(storageObj, itemId));
  return resultsList.join('');
}
// Generate input of type range for every attribute available
// using their corresponding min and max values
function generateRange(attrObj, attrKey) {
  return `
  <div class="flex-container-row width-half mq-m-width-fifth pad-min attribute-range">
  <label for="${attrKey}" class="attribute-label">${attrKey}</label>
  <p class="attribute-label-description text-300 width-full">${attrObj[attrKey].description}</p>
  <img src="./images/icons/attributes/${attrKey}-min.svg" alt="" class="attribute-icon" />
  <input
    type="range"
    name="${attrKey}"
    id="${attrKey}"
    min="${attrObj[attrKey].min}"
    max="${attrObj[attrKey].max}"
    value="${attrObj[attrKey].value}"
    step="${attrObj[attrKey].step}"
    class=""
  />
  <img src="./images/icons/attributes/${attrKey}-max.svg" alt="" class="attribute-icon"/>
  </div>`;
}
// Compose the ranges html
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
// Generate an element for the recommendations list
function generateRecommendationArticle(storageObj, itemId) {
  const itemObj = storageObj[itemId];
  const img = itemObj.album.images.length
    ? `<img src="${itemObj.album.images[0].url}" alt="'${itemObj.album.name}.'. Album cover." class="width-full radius shadow"/>`
    : '<img src="images/noimage.png" alt="No image found." class="width-full radius shadow"/>';

  return `
  <li>
   <article id="recommendation-item" class="flex-container-row card reccomendation-card">
     <section id="recommendation-album-img" class="width-forty card-img">
      <div class="image-box">
        <div class="img-wrapper">
          ${img}
          <div class="overlay radius">
          <a 
           href="${itemObj.external_urls.spotify}"
           target="_blank" 
           class="song-result tertiary-txt" 
           data-song-id="${itemObj.id}">
            <img src="images/icons/play.svg" alt="Play in spotify." class="play" />
          </a>
          </div>
        </div>
      </div>
     
     </section>
     <section id="recommendation-content" class="rows card-content width-sixty pad-300-left pad-300-top">
      <section id="recommendation-content-heading" class="">
       <h3 class="text-500 mq-m-text-800">
       <a 
       href="${itemObj.external_urls.spotify}"
       target="_blank" 
       class="song-result tertiary-txt focus-txt" 
       data-song-id="${itemObj.id}">
          ${itemObj.name}
       </a>
       </h3>
      </section>
      <section id="recommendation-content-subheading" class="flex-container-row mq-m-flex-container-column">
        <div class="rows flex-item-wrapper width-half pad-300-h">
          <h4 class="text-300 mq-m-text-600 primary-decoration-b">Artist(s)</h4>
          <p class="mq-m-text-500">${itemObj.artists.map((e) => e.name).join(', ')}<p>
        </div>
        <div class="rows flex-item-wrapper width-half pad-300-h">
          <h4 class="text-300 mq-m-text-600 primary-decoration-b">Album</h4>
          <p class="mq-m-text-500">${itemObj.album.name}<p>
        </div>
      </section>
      <section id="recommendation-content-description" class="">
     </section>
   </article>
  </li>`;
}

/* -------- Renderering functions -------- */

// Render a list using the corresponding generators
// Used to render search results and recommendations
function renderResults(storageObj, renderSectionStr, generatorFunc) {
  $(`${renderSectionStr}`).html(generateResultsList(storageObj, generatorFunc));
}
// Set the inputs values to show what is stored in targetAttributes
function adjustAtrrValues(attrObj) {
  Object.keys(attrObj).forEach((attr) => {
    $(`#${attr}`).val(attrObj[attr].value);
  });
}
// If customize-recommendations section is empty (on document load)
// add the input ranges inside the fieldset
function renderAtrrValues(attrObj) {
  if (!$('#customize-recommendations').find('input').length) {
    $('#customize-recommendations').find('fieldset').append(generateAttributeRanges(targetAttributes));
  }
  adjustAtrrValues(attrObj);
}
// Clear search results and move selection to the selections section
function renderSeedSelection(jQueryObj) {
  $('#seed-selection-list').append(jQueryObj);
  $('#search-results-list').empty();
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
      renderError('Item already selected.');
    } else if (Object.keys(seedSelection).length >= 5) {
      // Spotify's API has a limit of 5 seeds for recommendations, value hard-coded here
      renderError('Delete one selection before adding another.');
    } else {
      $(e.currentTarget).removeClass('search-result-item');
      $(e.currentTarget).addClass('selected-item');
      $(e.currentTarget).parent().removeClass('search-list-element');
      $(e.currentTarget).parent().addClass('selected-list-element');
      $(e.currentTarget).find('.caption').find('h4').addClass('hidden');
      $(e.currentTarget).find('.overlay').append('<img src="images/icons/cancel.svg" alt="Delete selection." class="cancel-icon" />');
      $(e.currentTarget).off();

      renderSeedSelection($(e.currentTarget).parent());
      $('#search-results').addClass('hidden');
      $('#seed-selection').removeClass('hidden');
      requestItemObject(articleData.id, articleData.type)
        .then((itemObj) => storeSeedItem(itemObj, $(e.currentTarget)))
        .then((seedSelectionObj) => requestRecommendations(seedSelectionObj, targetAttributes))
        .then((recommendationsObj) => storeResults(recommendations, recommendationsObj.tracks))
        .then((storedRecommendationsObj) => {
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
      clearStoredObj(recommendations);

      $('#seed-selection').addClass('hidden');
      $('#recommendations').addClass('hidden');
    }
  });
}
// Listen for a click on the clear all icon or text
function handleClearAllSelected() {
  $('.clear-all').on('click', '.clear', (e) => {
    $('#seed-selection-list').empty();
    $('#recommendations-results-list').empty();
    clearStoredObj(seedSelection);
    clearStoredObj(recommendations);

    $('#seed-selection').addClass('hidden');
    $('#recommendations').addClass('hidden');
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
  handleKeywordSearchSubmit();
  handleQueryResultClick();
  handleSelectedClick();
  handleClearAllSelected();
  handleCustomizeSubmit();
}
// jQuery document ready load
$(handleAppLoad());
