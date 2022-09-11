import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import "@babylonjs/core/Debug/debugLayer"; // Augments the scene with the debug methods
import "@babylonjs/inspector";
import {
    Axis,
    Color3, CubeTexture, DirectionalLight, GroundMesh, InstancedMesh, Mesh,
    MeshBuilder, PointLight,
    SceneLoader, ShadowGenerator, Space,
    StandardMaterial,
    Texture
} from "@babylonjs/core";
import {addLabelToMesh} from "./gui"; // Injects a local ES6 version of the inspector to prevent automatically relying on the none compatible version

// Get the canvas element from the DOM.
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

// Associate a Babylon Engine to it.
const engine = new Engine(canvas);

const scene = createScene();
const camera = initializeCamera(scene);
createSky(scene);
const ground = createEarth(scene); //'ground1', { width: 6, height: 6, subdivisions: 2 }, scene
ground.checkCollisions = true;
generateRandomTrees(camera, ground);


engine.runRenderLoop(() => {
    scene.render();
});

scene.debugLayer.show();

/**
 * @param {Scene} scene
 * @returns {GroundMesh}
 */
function createEarth(scene):GroundMesh {
    // Ground
    const groundOptions = {
        width: 200,
        height: 200,
        subdivisions: 250,
        minHeight: 0,
        maxHeight: 10,
        onReady: (mesh) => {console.log('Ground is ready');},
        updatable: false
    };

    const ground:GroundMesh = MeshBuilder.CreateGroundFromHeightMap("ground", "./textures/earth.png", groundOptions, scene);
    const groundMaterial:StandardMaterial = new StandardMaterial("ground", scene);
    groundMaterial.diffuseTexture = new Texture("./textures/earth_texture.png", scene);
    //groundMaterial.diffuseTexture.scale(6);
    //groundMaterial.diffuseTexture.uScale = 6;
    //groundMaterial.diffuseTexture.vScale = 6;
    groundMaterial.specularColor = new Color3(0, 0, 0);
    ground.position.y = 0;
    ground.material = groundMaterial;
    return ground;
}

/**
 * @param {Scene} scene
 */
function createSky(scene) {
    // Skybox
    const skybox:Mesh = MeshBuilder.CreateBox("skyBox", {
        size:1000.0
    }, scene);
    const skyboxMaterial:StandardMaterial = new StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    skyboxMaterial.reflectionTexture = new CubeTexture("https://www.babylonjs-playground.com/textures/TropicalSunnyDay", scene);
    skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new Color3(0, 0, 0);
    skyboxMaterial.specularColor = new Color3(0, 0, 0);
    skyboxMaterial.disableLighting = true;
    skybox.material = skyboxMaterial;
}

/**
 * @param {Scene} scene
 * @returns {FreeCamera}
 */
function initializeCamera(scene):FreeCamera {
    const camera:FreeCamera = new FreeCamera("camera1", new Vector3(5, 2, 0), scene);
    camera.setTarget(Vector3.Zero());
    camera.attachControl(canvas, true);

    //Then apply collisions and gravity to the active camera
    camera.checkCollisions = true;
    camera.applyGravity = true;
    return camera;
}

/**
 * @returns {Scene}
 */
function createScene(): Scene {
    const scene: Scene = new Scene(engine);
    new HemisphericLight("light1", new Vector3(1, 1, 0), scene);
    new PointLight("Omni0", new Vector3(60, 100, 10), scene);

    scene.gravity = new Vector3(0, -0.9, 0);
    scene.collisionsEnabled = true;
    return scene;
}

/**
 *
 * @param {FreeCamera} camera
 * @param {GroundMesh} ground
 */
function generateRandomTrees(camera, ground) {
    const light:DirectionalLight = new DirectionalLight("dir01", new Vector3(0, -1, -0.3), scene);

    ground.onReady = function () {
        const shadowGenerator:ShadowGenerator = new ShadowGenerator(1024, light);
        SceneLoader.ImportMesh("", "./models/tree/", "tree.babylon", scene, function (newMeshes) {
            //mesh.material.opacityTexture = null;
            const mesh = newMeshes[0] as Mesh;

            mesh.material.backFaceCulling = false;
            mesh.isVisible = false;
            mesh.position.y = ground.getHeightAtCoordinates(0, 0); // Getting height from ground object

            shadowGenerator.getShadowMap().renderList.push(newMeshes[0]);
            const range = 100;
            const count = 100;
            for (let index = 0; index < count; index++) {
                const newInstance:InstancedMesh = mesh.createInstance("i" + index);
                const x = range / 2 - Math.random() * range;
                const z = range / 2 - Math.random() * range;

                const y = ground.getHeightAtCoordinates(x, z); // Getting height from ground object

                newInstance.position = new Vector3(x, y, z);

                newInstance.rotate(Axis.Y, Math.random() * Math.PI * 2, Space.WORLD);

                const scale = 0.5 + Math.random() * 2;
                newInstance.scaling.addInPlace(new Vector3(scale, scale, scale));

                shadowGenerator.getShadowMap().renderList.push(newInstance);
            }
            shadowGenerator.getShadowMap().refreshRate = 0; // We need to compute it just once
            shadowGenerator.usePoissonSampling = true;
        });
    }
}

function addBoxToScene() {
    const box:Mesh = MeshBuilder.CreateBox("box", {
        width: 10,
        height: 4,
        depth: 0.1
    })
    box.scaling.x = 1;
    box.scaling.y = 1;
    box.scaling.z = 1;

    box.position = new Vector3(-2, 2, -2);
    //addLabelToMesh(box);
}
addBoxToScene();



SceneLoader.AppendAsync("./models/goat/source/", "alpine_goat_non-commercial.glb", scene).then(scene=>{
    console.log("Goat Loaded");
});
