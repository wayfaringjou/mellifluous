'use strict';

// POST request to spotify to get access token
function requestAccessToken() {
  // Define request headers
  const authHeaders = new Headers({
    Authorization: 'Basic MTdlYzc2MmQyNDY1NDFjY2E5Mzg5OTk4MTAxMTZkN2Y6MjkyMDk4MTA5NmVkNDliMDg5Yjg0ZjQ2YTZiN2QwMjI=',
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

function displaySongResults(tracksJson) {
  const foundSongs = tracksJson.tracks.items;

  $('#search-results-list').empty();

  for (let i = 0; i < foundSongs.length; i++) {
    $('#search-results-list').append(`
    <li>
    <h3>${foundSongs[i].name}</h3>
    <h4>Artist(s)</h4>
    <p>${foundSongs[i].artists.map((e) => e.name).join(', ')}<p>
    <h4>Album</h4>
    <p>${foundSongs[i].album.name}<p>
    </li>`);
  }
}

function handleSongSearchSubmit() {
  $('#song-search').on('submit', (e) => {
    e.preventDefault();
    const songQuery = $(e.currentTarget).find('#song-search-input').val();
    console.log(songQuery);

    requestAccessToken()
      .then((token) => requestSongSearch(songQuery, token))
      .then((tracksJson) => displaySongResults(tracksJson));
  });
}

// Load listeners when document is ready
function handleAppLoad() {
  // Listen to song search form submission
  handleSongSearchSubmit();
  // TODO: Listen to clicking any of the songs on results list
}
// jQuery document ready load
$(handleAppLoad());
