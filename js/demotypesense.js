const { autocomplete } = window['@algolia/autocomplete-js'];
let minh;
let typesenseClient = new Typesense.Client({
  apiKey: 'O0CWHl5yAZtDJjtLIZJRUx/MRJmoe94aYBR4NHWEgW4=',
  nodes: [
    {
      url: 'https://placing-exercise-valley-commissioner.trycloudflare.com',
    },
  ],
  connectionTimeoutSeconds: 2,
});

const map = L.map('map').setView([10.792987, 106.6927443], 15);

let location_user = null;

const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

autocomplete({
  container: '#autocomplete',
  placeholder: 'Type in an address in Ho Chi Minh city. Eg: 9 Nguyen Trai',
  detachedMediaQuery: 'none',
  async getSources({ query }) {

    const searchParams = {
      q: query,
      query_by: 'name_place,address,old_address,old_address_eng,address_eng',
      highlight_full_fields: 'name_place',
      highlight_start_tag: '<b>',
      highlight_end_tag: '</b>',
      per_page: 20,
    };

    if (location_user != null) {
      searchParams.sort_by = `location(${location_user.lat}, ${location_user.lng}):asc`;
    }

    const results = await typesenseClient
    .collections('address_demo_hcm')
    .documents()
    .search(searchParams);

    function handleClick() {
      map.setView([minh.location[0], minh.location[1]], 17, { animate: true, duration: 2 });
      
      L.marker([minh.location[0], minh.location[1]]).addTo(map);
    } 
      
    return [
      {
        sourceId: 'predictions',
        getItems() {
          return results.hits;
        },
        getItemInputValue({
          item: {
            document: { name_place, address, old_address, location },
          },
        }) {
          minh = { name_place, address, old_address, location };
          return `${name_place}`;
        },
        templates: {
          item({ item, html }) {
            const name_place = item.highlights.find((h) => h.field === 'name_place')?.value || item.document['name_place'];
            
            const html_fragment = html`${name_place}`;
            let address = item.highlights.find((h) => h.field === 'address')?.value || item.document['address'];
            let html_fragment2 = html`${address}`;
            let mimi = document.getElementById("new_address");
            let isChecked = mimi.checked;
            if (!isChecked) {
              address = item.highlights.find((h) => h.field === 'old_address')?.value || item.document['old_address'];
              html_fragment2 = html`${address}`;
            }
            let distant = '';
            if(location_user != null) {
              distant = '(' + getDistanceFromLatLonInKm(location_user.lat, location_user.lng, item.document.location[0], item.document.location[1]) + ' Km) '
            }
            return html`<div onClick=${handleClick} dangerouslySetInnerHTML=${{ __html: html_fragment }}></div> <div onClick=${handleClick} dangerouslySetInnerHTML=${{ __html: distant + html_fragment2 }}></div>`;
          },
          noResults() {
            return 'No results found.';
          },
        },
      },
    ];
  },
});

function getLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(success, error);
  } else { 
    x.innerHTML = "Geolocation is not supported by this browser.";
  }
}

function success(position) {
  const x = document.getElementById("demo");
  x.innerHTML = "Latitude: " + position.coords.latitude + " Longitude: " + position.coords.longitude;
  console.log("Latitude: " + position.coords.latitude + "<br>Longitude: " + position.coords.longitude);
  location_user = {
    lat: position.coords.latitude, lng: position.coords.longitude
  };
}

function error() {
  alert("Sorry, no position available.");
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  var R = 6371; // Bán kính trái đất tính bằng km
  var dLat = deg2rad(lat2 - lat1); 
  var dLon = deg2rad(lon2 - lon1); 
  var a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  var d = R * c; // Khoảng cách theo km
  return d.toFixed(2);
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
