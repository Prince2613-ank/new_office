# Geolocated GLB Satellite Viewer

This folder contains a browser viewer for:

```text
new_house2nd_floor_khr_mesh_optimized.glb
```

It displays the model on a satellite base map using CesiumJS. Set the exact site
position in the controls on the page, or edit the `placement` object near the top
of `main.js`:

```js
const placement = {
  latitude: 28.660825288456,
  longitude: 77.122364943489,
  height: 0,
  heading: 0,
  scale: 1,
};
```

Run it from this folder with a local web server:

```powershell
python -m http.server 5173
```

Then open:

```text
http://localhost:5173
```

The page needs internet access for CesiumJS and the satellite imagery. Use the
`Satellite` button for the satellite basemap with the model. Use the `2nd Floor`
button for the model only on a black background.

## Hosting

This is a static site. The full folder must be hosted together:

```text
index.html
styles.css
main.js
new_house2nd_floor_khr_mesh_optimized.glb
netlify.toml
```

Recommended simple option: deploy this folder to Netlify. The included
`netlify.toml` sets the correct `model/gltf-binary` content type and cache
headers for the GLB file.

Avoid GitHub Pages or Cloudflare Pages for this exact folder because the GLB is
larger than their normal single-file upload limits.

The viewer currently loads `new_house2nd_floor_khr_mesh_optimized.glb`.
