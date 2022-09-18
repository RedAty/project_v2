import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import {Matrix, Vector3} from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import "@babylonjs/core/Debug/debugLayer"; // Augments the scene with the debug methods
import "@babylonjs/inspector";
import {
    ArcRotateCamera,
    Axis,
    Color3, Color4, CubeTexture, DirectionalLight, GroundMesh, InstancedMesh, Mesh,
    MeshBuilder, PointLight, Quaternion,
    SceneLoader, ShadowGenerator, Space,
    StandardMaterial,
    Texture, Viewport
} from "@babylonjs/core";
import {addLabelToMesh} from "./gui";
import {Player} from "./characterController";
import {PlayerInput} from "./inputController";

// Get the canvas element from the DOM.
const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

// Associate a Babylon Engine to it.
const engine = new Engine(canvas);

const scene = createScene();
//const camera = initializeCamera(scene);
//initializeMinimap(scene);
createSky(scene);
const ground = createEarth(scene); //'ground1', { width: 6, height: 6, subdivisions: 2 }, scene
ground.checkCollisions = true;
generateRandomTrees(ground);

declare global {
    interface Window { game: any; }
}

window.game = window.game || {};



initializePlayer(scene).then((player)=>{
    window.game.player = player;
    window.game.scene = scene;
    scene.executeWhenReady(()=>{
        engine.runRenderLoop(() => {
            scene.render();
        });
    });
});


//scene.debugLayer.show();

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
    if (!scene.activeCameras) {
        scene.activeCameras = [];
    }
    camera.layerMask = 1;
    scene.activeCameras.push(camera);
    //Then apply collisions and gravity to the active camera
    camera.checkCollisions = true;
    camera.applyGravity = true;
    return camera;
}

function initializeMinimap(scene) {
    const minimapCamera:ArcRotateCamera = new ArcRotateCamera("Camera", -Math.PI/2, 0.001, 170, Vector3.Zero(), scene);
    if (!scene.activeCameras) {
        scene.activeCameras = [];
    }

    scene.activeCameras.push(minimapCamera);

    minimapCamera.viewport = new Viewport(0.79, 0.79, 0.19, 0.19);

    minimapCamera.layerMask = 2;
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
 * @param {GroundMesh} ground
 */
function generateRandomTrees(ground) {
    const light:DirectionalLight = new DirectionalLight("dir01", new Vector3(0, -1, -0.3), scene);

    ground.onReady = function () {
        const shadowGenerator:ShadowGenerator = new ShadowGenerator(1024, light);

        SceneLoader.ImportMesh("", "./models/tree/", "tree.babylon", scene, function (newMeshes) {
            //mesh.material.opacityTexture = null;
            const mesh = newMeshes[0] as Mesh;

            mesh.material.backFaceCulling = false;
            mesh.isVisible = false;
            mesh.layerMask = 1;
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
                newInstance.layerMask = 1;
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

async function loadCharacterAssets(scene) {

    async function loadCharacter() {
        //collision mesh
        const outer = MeshBuilder.CreateBox("outer", { width: 2, depth: 1, height: 3 }, scene);
        outer.isVisible = false;
        outer.isPickable = false;
        outer.checkCollisions = true;

        //move origin of box collider to the bottom of the mesh (to match player mesh)
        outer.bakeTransformIntoVertices(Matrix.Translation(0, 1.5, 0))

        //for collisions
        outer.ellipsoid = new Vector3(1, 1.5, 1);
        outer.ellipsoidOffset = new Vector3(0, 1.5, 0);

        outer.rotationQuaternion = new Quaternion(0, 1, 0, 0); // rotate the player mesh 180 since we want to see the back of the player

        return SceneLoader.ImportMeshAsync(null, "./models/mixamo/", "leonard.glb", scene).then((result) =>{
            console.log(result);
            const root = result.meshes[0];
            //body is our actual player mesh
            const body = root;
            body.parent = outer;
            body.isPickable = false; //so our raycasts dont hit ourself
            body.getChildMeshes().forEach(m => {
                m.isPickable = false;
            })

            return {
                mesh: outer as Mesh,
                animationGroups: result.animationGroups,
                skeleton: result.skeletons[0]
            }
        });
    }
    return loadCharacter();

}

async function initializePlayer(scene): Promise<Player> {
    const light = new PointLight("sparklight", new Vector3(0, 0, 0), scene);
    light.diffuse = new Color3(0.08627450980392157, 0.10980392156862745, 0.15294117647058825);
    light.intensity = 35;
    light.radius = 1;

    const shadowGenerator = new ShadowGenerator(1024, light);
    shadowGenerator.darkness = 0.4;

    const assets = await loadCharacterAssets(scene);
    const _input = new PlayerInput(scene); //detect keyboard/mobile inputs

    //Create the player
    const player = new Player(assets, scene, shadowGenerator, _input);
    const camera = player.activatePlayerCamera();
    return player;
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
