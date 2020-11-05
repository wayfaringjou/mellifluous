'use strict';

// POST request to spotify to get access token
function requestAccessToken() {
  // Define request headers
  const authHeaders = new Headers({
    Authorization: '',
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
// Request a song from spotify
function requestSongSearch(songQuery, token) {
  const queryUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(songQuery)}&type=track`;
  const queryHeaders = new Headers({
    Authorization: `Bearer ${token}`,
  });
  const queryOptions = {
    method: 'GET',
    headers: queryHeaders,
  };

  return fetch(queryUrl, queryOptions)
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(`Server response: ${response.status}`);
    })
    .catch((error) => console.log(error.message));
}
// Render found results to song query
function displaySongResults(tracksJson) {
  const foundSongs = tracksJson.tracks.items;

  $('#search-results-list').empty();

  for (let i = 0; i < foundSongs.length; i++) {
    $('#search-results-list').append(`
    <li>
    <h3>
    <a 
      href="#" 
      class="song-result" 
      data-song-id="${foundSongs[i].id}">
    ${foundSongs[i].name}</a></h3>
    <h4>Artist(s)</h4>
    <p>${foundSongs[i].artists.map((e) => e.name).join(', ')}<p>
    <h4>Album</h4>
    <p>${foundSongs[i].album.name}<p>
    </li>`);
  }
}

// Listen for song search form submission
function handleSongSearchSubmit() {
  $('#song-search').on('submit', (e) => {
    e.preventDefault();
    const songQuery = $(e.currentTarget).find('#song-search-input').val();

    requestAccessToken()
      .then((token) => requestSongSearch(songQuery, token))
      .then((tracksJson) => displaySongResults(tracksJson));
  });
}

function requestSongReccomendation(token, songSelectionId, danceMin = 0.0, danceMax = 1.0)
//  attributes = {
//  danceability: { min: 0.0, max: 1.0 },
//  energy: { min: 0.0, max: 1.0 },
// popularity: { min: 0.0, max: 1.0 },
// })
{
  const endpoint = 'https://api.spotify.com/v1/recommendations';
  const reccUrl = `${endpoint}?seed_tracks=${songSelectionId}&min_danceability=${danceMin}&max_danceability=${danceMax}`;

  console.log(reccUrl);

  const reccHeaders = new Headers({
    Authorization: `Bearer ${token}`,
  });
  const reccOptions = {
    method: 'GET',
    headers: reccHeaders,
  };

  return fetch(reccUrl, reccOptions)
    .then((response) => {
      if (response.ok) {
        return response.json();
      }
      throw new Error(`Server response: ${response.status}`);
    })
    .catch((error) => console.log(error.message));
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

function handleSongResultClick() {
  $('#search-results-list').on('click', '.song-result', (e) => {
    e.preventDefault();
    const songSelectionName = $(e.currentTarget).text();
    const songSelectionId = $(e.currentTarget).data().songId;
    console.log(songSelectionId);
    $('#search-results-list').empty();
    $('#search-results-list').append(`<li><h3 class="selected-song" data-song-id=${songSelectionId} >${songSelectionName}</h3></li>`);
    requestAccessToken()
      .then((token) => requestSongReccomendation(token, songSelectionId))
      .then((reccsJson) => displayReccomendations(reccsJson));
  });
}

function handleCustomizeReccsSubmit() {
  $('#customize-recommendations').on('submit', (e) => {
    e.preventDefault();
    console.log($('#search-results-list').find('.selected-song').data().songId);
    console.log($(e.currentTarget).serializeArray());
    const { songId } = $('#search-results-list').find('.selected-song').data();
    const danceMin = $(e.currentTarget).serializeArray()[0].value;
    const danceMax = $(e.currentTarget).serializeArray()[1].value;

    requestAccessToken()
      .then((token) => requestSongReccomendation(token, songId, danceMin, danceMax))
      .then((reccsJson) => displayReccomendations(reccsJson));
  });
}

// Load listeners when document is ready
function handleAppLoad() {
  // Listen to song search form submission
  handleSongSearchSubmit();
  // Listen to click on selected song
  handleSongResultClick();
  handleCustomizeReccsSubmit();
}
// jQuery document ready load
$(handleAppLoad());
