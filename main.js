const MODEL_URLS = {
  "first-floor": "./new_house1st_floor_quality_preserved.glb",
  "second-floor": "./new_house2nd_floor_compressed.glb",
};

const placement = {
  latitude: 28.660825288456,
  longitude: 77.122364943489,
  height: 0,
  heading: 0,
  scale: 1,
};

const cameraPresets = {
  "first-floor": {
    destination: {
      x: 1248265.2877160413,
      y: 5460140.498499097,
      z: 3040964.6935627214,
    },
    direction: {
      x: 0.36256492583430877,
      y: -0.9212223637199105,
      z: 0.14105329183348797,
    },
    up: {
      x: 0.5668547205550337,
      y: 0.3381218090767029,
      z: 0.7512319002885676,
    },
  },
  "second-floor": {
    destination: {
      x: 1248265.2877160413,
      y: 5460140.498499097,
      z: 3040964.6935627214,
    },
    direction: {
      x: 0.36256492583430877,
      y: -0.9212223637199105,
      z: 0.14105329183348797,
    },
    up: {
      x: 0.5668547205550337,
      y: 0.3381218090767029,
      z: 0.7512319002885676,
    },
  },
  satellite: {
    destination: {
      x: 1248266.837783013,
      y: 5460165.774975385,
      z: 3040973.4030182445,
    },
    direction: {
      x: 0.24538647669310115,
      y: -0.9694216944378546,
      z: -0.0026562020603112524,
    },
    up: {
      x: 0.6225184456944012,
      y: 0.15547442926377542,
      z: 0.7670061842093128,
    },
  },
};

const statusText = document.querySelector("#status");
const loaderPanel = document.querySelector("#loader");
const progressBar = document.querySelector("#bar");
const percentText = document.querySelector("#percent");
const satelliteButton = document.querySelector("#satelliteButton");
const firstFloorButton = document.querySelector("#firstFloorButton");
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
let activeFloor = "second-floor";
let loadedFloor = null;
let pendingModelUpdate = false;

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
  if (modelPrimitive && loadedFloor === activeFloor) {
    refreshModelPlacement();
    statusText.textContent = getStatusMessage();
    return;
  }

  if (modelPrimitive) {
    viewer.scene.primitives.remove(modelPrimitive);
    modelPrimitive = null;
    loadedFloor = null;
  }

  if (loadingModel) {
    pendingModelUpdate = true;
    return;
  }

  const floorToLoad = activeFloor;
  loadingModel = true;
  loaderPanel.classList.remove("is-hidden");
  statusText.textContent =
    floorToLoad === "first-floor"
      ? "Loading 1st floor GLB model..."
      : "Loading 2nd floor GLB model...";
  progressBar.style.width = "45%";
  percentText.textContent = "Loading";

  try {
    modelPrimitive = await Cesium.Model.fromGltfAsync({
      url: MODEL_URLS[floorToLoad],
      modelMatrix: getModelMatrix(),
      scale: placement.scale,
      minimumPixelSize: 96,
      maximumScale: 20000,
      shadows: Cesium.ShadowMode.DISABLED,
    });

    viewer.scene.primitives.add(modelPrimitive);
    loadedFloor = floorToLoad;
    if (modelPrimitive.readyEvent) {
      modelPrimitive.readyEvent.addEventListener(() => {
        zoomToModel();
        viewer.scene.requestRender();
      });
    }
    progressBar.style.width = "100%";
    percentText.textContent = "100%";
    statusText.textContent = getStatusMessage();
    loaderPanel.classList.add("is-hidden");
    modelPrimitive.show = true;
    if (activeView !== "satellite") {
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
    if (pendingModelUpdate || (modelPrimitive && activeFloor !== loadedFloor)) {
      pendingModelUpdate = false;
      updateModel();
    }
  }
}

function refreshModelPlacement() {
  if (modelPrimitive) {
    modelPrimitive.modelMatrix = getModelMatrix();
    modelPrimitive.scale = placement.scale;
    zoomToModel();
  }
}

function getFloorLabel() {
  return activeFloor === "first-floor" ? "1st floor" : "2nd floor";
}

function getStatusMessage() {
  return activeView === "satellite"
    ? `Satellite basemap and ${getFloorLabel()} model visible.`
    : `${getFloorLabel()} model only.`;
}

function zoomToModel() {
  if (!modelPrimitive && !loadingModel) return;

  if (modelPrimitive && activeView !== "satellite") {
    const boundingSphere = getModelBoundingSphere();
    if (boundingSphere) {
      viewer.camera.flyToBoundingSphere(boundingSphere, {
        duration: 0.8,
        offset: new Cesium.HeadingPitchRange(
          Cesium.Math.toRadians(35),
          Cesium.Math.toRadians(-24),
          boundingSphere.radius * 2.4,
        ),
      });
      return;
    }
  }

  const preset = cameraPresets[activeView] || cameraPresets["second-floor"];
  if (!preset) {
    return;
  }

  viewer.camera.flyTo({
    destination: new Cesium.Cartesian3(
      preset.destination.x,
      preset.destination.y,
      preset.destination.z,
    ),
    orientation: {
      direction: new Cesium.Cartesian3(
        preset.direction.x,
        preset.direction.y,
        preset.direction.z,
      ),
      up: new Cesium.Cartesian3(preset.up.x, preset.up.y, preset.up.z),
    },
    duration: 0.8,
  });
}

function getModelBoundingSphere() {
  try {
    return modelPrimitive?.boundingSphere || null;
  } catch {
    return null;
  }
}

function setActiveButton() {
  satelliteButton.classList.toggle("is-active", activeView === "satellite");
  firstFloorButton.classList.toggle("is-active", activeFloor === "first-floor");
  secondFloorButton.classList.toggle("is-active", activeFloor === "second-floor");
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
  statusText.textContent = getStatusMessage();
  zoomToModel();
  viewer.scene.requestRender();
}

function setSecondFloorView() {
  activeView = "second-floor";
  activeFloor = "second-floor";
  viewer.imageryLayers.removeAll(true);
  viewer.scene.globe.show = false;
  viewer.scene.skyAtmosphere.show = false;
  if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
  if (viewer.scene.sun) viewer.scene.sun.show = false;
  if (viewer.scene.moon) viewer.scene.moon.show = false;
  setActiveButton();
  updateModel();
  viewer.scene.requestRender();
}

function setFirstFloorView() {
  activeView = "first-floor";
  activeFloor = "first-floor";
  viewer.imageryLayers.removeAll(true);
  viewer.scene.globe.show = false;
  viewer.scene.skyAtmosphere.show = false;
  if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
  if (viewer.scene.sun) viewer.scene.sun.show = false;
  if (viewer.scene.moon) viewer.scene.moon.show = false;
  setActiveButton();
  updateModel();
  viewer.scene.requestRender();
}

satelliteButton.addEventListener("click", () => {
  setSatelliteView();
});

firstFloorButton.addEventListener("click", () => {
  setFirstFloorView();
});

secondFloorButton.addEventListener("click", () => {
  setSecondFloorView();
});

updateModel();
setSecondFloorView();
