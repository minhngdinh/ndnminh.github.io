const { autocomplete } = window['@algolia/autocomplete-js'];
let minh;
let typesenseClient = new Typesense.Client({
  apiKey: 'O0CWHl5yAZtDJjtLIZJRUx/MRJmoe94aYBR4NHWEgW4=',
  nodes: [
    {
      url: 'http://10.10.13.58:8108',
    },
  ],
  connectionTimeoutSeconds: 2,
});

const map = L.map('map').setView([10.792987, 106.6927443], 15);

const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

autocomplete({
  container: '#autocomplete',
  placeholder: 'Type in an address in Ho Chi Minh city. Eg: 9 Nguyen Trai',
  detachedMediaQuery: 'none',
  async getSources({ query }) {
    const results = await typesenseClient
      .collections('address_demo_hcm')
      .documents()
      .search({
        q: query,
        query_by: 'name_place,address,old_address,old_address_eng,address_eng',
        highlight_full_fields: 'name_place',
        highlight_start_tag: '<b>',
        highlight_end_tag: '</b>',
        per_page: 10
      });
    
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
            return html`<div onClick=${handleClick} dangerouslySetInnerHTML=${{ __html: html_fragment }}></div> <div onClick=${handleClick} dangerouslySetInnerHTML=${{ __html: html_fragment2 }}></div>`;
          },
          noResults() {
            return 'No results found.';
          },
        },
      },
    ];
  },
});
