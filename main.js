const MODEL_URL = "./new_house2nd_floor_khr_quality.glb";

const placement = {
  latitude: 28.660825288456,
  longitude: 77.122364943489,
  height: 0,
  heading: 0,
  scale: 1,
};

const statusText = document.querySelector("#status");
const loaderPanel = document.querySelector("#loader");
const progressBar = document.querySelector("#bar");
const percentText = document.querySelector("#percent");
const satelliteButton = document.querySelector("#satelliteButton");
const secondFloorButton = document.querySelector("#secondFloorButton");

Cesium.Ion.defaultAccessToken = "";

const satelliteProvider = () =>
  new Cesium.UrlTemplateImageryProvider({
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    credit:
      "Tiles courtesy of Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maximumLevel: 19,
  });

const viewer = new Cesium.Viewer("map", {
  animation: false,
  baseLayerPicker: false,
  fullscreenButton: false,
  geocoder: false,
  homeButton: false,
  infoBox: false,
  sceneModePicker: false,
  selectionIndicator: false,
  timeline: false,
  navigationHelpButton: false,
  terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  imageryProvider: false,
});

viewer.scene.globe.depthTestAgainstTerrain = true;
viewer.scene.skyAtmosphere.show = true;
viewer.scene.globe.enableLighting = true;
viewer.scene.backgroundColor = Cesium.Color.BLACK;

let modelPrimitive = null;
let loadingModel = false;
let activeView = "second-floor";

function getModelMatrix() {
  const position = Cesium.Cartesian3.fromDegrees(
    placement.longitude,
    placement.latitude,
    placement.height,
  );
  const headingPitchRoll = new Cesium.HeadingPitchRoll(
    Cesium.Math.toRadians(placement.heading),
    0,
    0,
  );
  return Cesium.Transforms.headingPitchRollToFixedFrame(position, headingPitchRoll);
}

async function updateModel() {
  if (modelPrimitive) {
    modelPrimitive.modelMatrix = getModelMatrix();
    modelPrimitive.scale = placement.scale;
    zoomToModel();
    return;
  }

  if (loadingModel) return;

  loadingModel = true;
  statusText.textContent = "Loading GLB model on satellite map...";
  progressBar.style.width = "45%";
  percentText.textContent = "Loading";

  try {
    modelPrimitive = await Cesium.Model.fromGltfAsync({
      url: MODEL_URL,
      modelMatrix: getModelMatrix(),
      scale: placement.scale,
      minimumPixelSize: 96,
      maximumScale: 20000,
      shadows: Cesium.ShadowMode.DISABLED,
    });

    viewer.scene.primitives.add(modelPrimitive);
    progressBar.style.width = "100%";
    percentText.textContent = "100%";
    statusText.textContent =
      activeView === "satellite"
        ? "Satellite basemap and 2nd floor model visible."
        : "2nd floor model only.";
    loaderPanel.classList.add("is-hidden");
    if (activeView === "second-floor") {
      modelPrimitive.show = true;
      viewer.scene.globe.show = false;
    }
    zoomToModel();
  } catch (error) {
    console.error(error);
    const message = error?.message || String(error);
    statusText.textContent =
      `Could not load the GLB: ${message}`;
    progressBar.style.width = "100%";
    percentText.textContent = "Error";
  } finally {
    loadingModel = false;
  }
}

function zoomToModel() {
  if (!modelPrimitive && !loadingModel) return;

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      placement.longitude,
      placement.latitude,
      Math.max(placement.height + 80, 70),
    ),
    orientation: {
      heading: Cesium.Math.toRadians(300),
      pitch: Cesium.Math.toRadians(-38),
      roll: 0,
    },
    duration: 0.8,
  });
}

function setActiveButton() {
  satelliteButton.classList.toggle("is-active", activeView === "satellite");
  secondFloorButton.classList.toggle("is-active", activeView === "second-floor");
}

function setSatelliteView() {
  activeView = "satellite";
  viewer.imageryLayers.removeAll(true);
  viewer.imageryLayers.addImageryProvider(satelliteProvider(), 0);
  viewer.scene.globe.show = true;
  viewer.scene.skyAtmosphere.show = true;
  if (viewer.scene.skyBox) viewer.scene.skyBox.show = true;
  if (viewer.scene.sun) viewer.scene.sun.show = true;
  if (viewer.scene.moon) viewer.scene.moon.show = true;
  if (modelPrimitive) modelPrimitive.show = true;
  setActiveButton();
  statusText.textContent = "Satellite basemap and 2nd floor model visible.";
  zoomToModel();
  viewer.scene.requestRender();
}

function setSecondFloorView() {
  activeView = "second-floor";
  viewer.imageryLayers.removeAll(true);
  viewer.scene.globe.show = false;
  viewer.scene.skyAtmosphere.show = false;
  if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
  if (viewer.scene.sun) viewer.scene.sun.show = false;
  if (viewer.scene.moon) viewer.scene.moon.show = false;
  if (modelPrimitive) modelPrimitive.show = true;
  setActiveButton();
  statusText.textContent = "2nd floor model only.";
  zoomToModel();
  viewer.scene.requestRender();
}

satelliteButton.addEventListener("click", () => {
  setSatelliteView();
});

secondFloorButton.addEventListener("click", () => {
  setSecondFloorView();
});

updateModel();
setSecondFloorView();
