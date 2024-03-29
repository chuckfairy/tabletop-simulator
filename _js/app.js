//World

var world, renderer;

var camera, camera2, camera3, camera4;

var controls, touchControls;

var plane, directionallight;


//Physics objects

var physics, physicGUI;

var raycaster = new THREE.Raycaster();

//Table top games

var TableTopGames = {

    Chess: {
        board: "_assets/images/chessboard.jpg",
        url: "_models/Bauhaus/bauhaus.scene",
        currentObjects: []
    },

    Jenga: {
        board: "_assets/textures/grass1.jpg",
        url: "_models/jenga/jenga.scene",
        currentObjects: []
    },

    Checkers: {
        board: "_assets/images/chessboard.jpg",
        url: "_models/checkers/checkers.scene",
        currentObjects: []
    },

    Backgammon: {
        board: "_assets/images/backgammon.jpg",
        url: "_models/backgammon/backgammon.scene",
        currentObjects: []
    }

};

var LoadedGames = {};

var CurrentGame = false;

var assetDirectory = "_models/";

window.onload = function() {
    init();
    initSkyBox();
    initTableControl();
    initPhysics();
    initGame( "Jenga" );
    world.LaunchWorld();
};

//Create world and setup
function init() {

    world = new THREE.World();
    world.init("webGL", {renderType: "webgl"});

    renderer = world.getRenderer();

    //Get and move camera default is at 0,0,0
    camera = world.getCamera();
    camera.position.set(0, 550, 800);
    camera.lookAt(new THREE.Vector3(0,0,0));
    camera.far = 4000;
    camera.updateProjectionMatrix();

    //Clone cameras and add to world cameras
    camera2 = camera.clone();
    camera3 = camera.clone();
    camera4 = camera.clone();

    world.addCamera(camera2);
    world.addCamera(camera3);
    world.addCamera(camera4);

    world.on("screen-resize", function(event) {

        var scalar = ((1 / (world.screenWidth / 1000)) * 300);
        scalarX = scalar + 700;
        scalarY = scalar + 550;

        var centerVector = new THREE.Vector3(0,0,0);

        camera.position.set(0, scalarY, scalarX);
        camera.lookAt(centerVector);

        camera2.position.set(0, scalarY, -scalarX);
        camera2.lookAt(centerVector);

        camera3.position.set(scalarX, scalarY, 0);
        camera3.lookAt(centerVector);

        camera4.position.set(-scalarX, scalarY, 0);
        camera4.lookAt(centerVector);

    });

    //Initialize camera and screen
    world.screenResize();

    //Create light
    directionallight = new THREE.DirectionalLight(0xfffff0, .8, 20, 400);
    directionallight.position.set(130, 170, -30);
    directionallight.castShadow = true;
    directionallight.shadowBias = .00001;
    directionallight.shadowCameraNear = 5;
    directionallight.shadowCameraFar = 500;
    directionallight.shadowCameraFov = 80;
    directionallight.shadowMapHeight = 2048; //2048
    directionallight.shadowMapWidth = 2048;
    directionallight.shadowDarkness = .6;
    //directionallight.shadowCameraVisible = true;

    world.addLight(directionallight);

}

function initSkyBox() {

    var geometry = new THREE.SphereGeometry(1000, 20, 20);
    var texture = THREE.ImageUtils.loadTexture( '_assets/images/hubble.jpg' );
    texture.minFilter = THREE.LinearFilter;

    //Create "space" skyBox
    var uniforms = {
        "tDiffuse": { type: 't', value: texture },
        "opacity":  { type: "f", value: 0.5 }
    };

    var material = new THREE.ShaderMaterial( {
        uniforms:       uniforms,
        vertexShader:   THREE.CopyShader.vertexShader,
        fragmentShader: THREE.CopyShader.fragmentShader
    });

    skyBox = new THREE.Mesh(geometry, material);
    skyBox.scale.set(-1, 1, 1);
    skyBox.renderDepth = 1000.0;

    //Create event handler for render before
    world.on("before-render", function(event) {

        //Get delta of seconds
        var delta = event.delta;
        skyBox.rotation.y += (delta / 70);

    });

    world.addMesh(skyBox);

}


//Initialze physics object and events

function initPhysics() {

    //Physics set using THREE.Physics object
    physics = new THREE.Physics({
        gravity: new THREE.Vector3(0, -9.8, 0)
    });

    //Set GUI see _js/guis/Physics.GUI.js
    physicsGUI = new THREE.Physics.GUI(physics);
    physicsGUI.appendToElement("gui");

    //Add mesh object to physics scene
    world.on("add-mesh", function(event) {

        physics.addObject(event.object, {type: "box"});

    });

    world.on("remove-mesh", function(event) {

        physics.removeObject(event.uuid);

    });

    //Create event handler for render before
    world.on("before-render", function(event) {

        //Get delta of seconds
        var delta = event.delta;
        physics.update(1/60);

    });

}


//Initialize tabletop controls desktop and mobile

function initTableControl() {

    //Create selector object and functions

    var octahedronGeo = new THREE.OctahedronGeometry(16, 2);

    var redWire = new THREE.MeshPhongMaterial({
          color: 0xFAD000, wireframe: true, emissive: 0x57184E,
          specular: 0xFFFFFF
     });

    var meshSelector = new THREE.Mesh(octahedronGeo, redWire);
    meshSelector.visible = false;

    var canMoveBoard = false;

    var selectedMesh, isGrabbing = false;

    var selectedCannonBody;

    var cameraNumber = 1;

    world.addMesh(meshSelector);


    //Click and tap event for finding cheese raycast intersections

    var findPointerIntersection = function(event) {

        if( isGrabbing ) { return; }


        //Coords given from click and touchdown event

        var coords = event.coords;

        raycaster.setFromCamera( coords, world.getCamera() );

        var intersects = raycaster.intersectObjects( world.getScene().children );

        for( var intersect in intersects ) {

            var object = intersects[intersect];
            selectedMesh = object.object;

            //Check if you can't move the gameboard
            if(selectedMesh.name === "gameboard" && !canMoveBoard) {
                continue;
            }

            var physicsObj = physics.getObject(selectedMesh.uuid);
            selectedCannonBody = physicsObj.cannon;

            if(!selectedCannonBody) { continue; }

            meshSelector.position.copy(physicsObj.object.position);
            meshSelector.visible = true;

            isGrabbing = true;

            return;

        }

    };


    //Pointer click up and touch up event

    var pointerCancel = function(event) {

        if( isGrabbing && !controls.touchNumber ) {

            meshSelector.visible = false;
            selectedCannonBody.mass = 1;
            isGrabbing = false;
            selectedCannonBody = false;

        }

    };


    //Chess piece pointer mover

    var pointerDrag = function(event) {

        if( isGrabbing ) {

            var movement = event.movement;

            var movement1 = movement.x * 200;
            var movement2 = movement.y * 200;

            var localPos = "z";

            //If shift or 2 or more fingers change direction
            if(
                controls.keyIsHeld("shift") ||
                touchControls.touchNumber > 1
            ) {

                localPos = "x";

            }

            var currentC = world.getCamera();

            if( currentC.position.z < -1 ||
                currentC.position.x > 1 ) {

                movement1 = -(movement1);

            }

            meshSelector.position[localPos] -= movement1;
            meshSelector.position.y -= movement2;

            selectedCannonBody.position.copy(meshSelector.position);
            selectedCannonBody.velocity.set(0,0,0);

        }

    };


    //Change camera based on keyboard number

    var keyboardChangeCamera = function(event) {

        var charName = event.charName;

        switch(charName) {

            case "1":
            case "2":
            case "3":
            case "4":
                world.setCamera( cameraNumber = (charName - 1) );
                break;
        }

    };

    //Change camera based on swipe

    var touchChangeCamera = function(event) {

        cameraNumber = ( (cameraNumber + 1) >= 4 ) ? 0 : cameraNumber + 1;
        world.setCamera(cameraNumber);

    };

    world.on("before-render", function(event) {

        if ( selectedCannonBody ) {
            selectedCannonBody.angularVelocity.set(0,0,0);
            selectedCannonBody.velocity.set(0,0,0);
            selectedCannonBody.position.copy(meshSelector.position);
        }

    });


    //Playground desktop controls

    controls = new THREE.KeyboardControls({

        events: {
            "click": findPointerIntersection,
            "clickup": pointerCancel,
            "mousedrag": pointerDrag,
            "keydown": keyboardChangeCamera
        }

    });


    //Playground mobile controls

    touchControls = new THREE.TouchControls({

        events: {
            "touchstart": findPointerIntersection,
            "touchend": pointerCancel,
            "touchmove": pointerDrag,
            "swipe": touchChangeCamera
        }

    }, world.getRenderer().domElement);

    //camera 3 as default
    world.setCamera(2);

    //HTML help controls
    document.getElementById("controls").onclick = function() {
        this.style.display = "none";
    }

}


//Load Game pieces

function initGame( name ) {

    var matChess = new THREE.MeshLambertMaterial({ color: 0xffffff, map: ''});

    //Create a floor
    var planegeo = new THREE.BoxGeometry(400, 400, 5);
    plane = new THREE.Mesh(planegeo, matChess);
    plane.name = "gameboard";
    plane.position.y -= 2.5;
    plane.rotation.x = -(Math.PI / 2);
    plane.receiveShadow = true;

    //Add box and light
    world.addMesh( plane );

    //Load default game
    loadGame( name );

    //Game choosing
    for( var name in TableTopGames ) {
        (function(name) {
            physicsGUI.addScene(name, function() { loadGame(name); });
        })(name);
    }

    //Game options
    var usingShadows = false;

    var changeShadows = function() {

        if( !usingShadows ) {
            world.useShadows(true, THREE.PCFSoftShadowMap, true);
            usingShadows = true;
        } else {
            world.useShadows();
            usingShadows = false;
        }

    };

    physicsGUI.addToFolder("Options", "Use Shadows", changeShadows);

}


//load game or renew saved game

function loadGame( name ) {

    var game = TableTopGames[name];

    if( !(game) ) {
        throw name + " : game not found";
    }

    //Check if not loaded
    if( !(game.loaded) ) {

        game.scene = new THREE.Object3D();

        game.boardMap = new THREE.ImageUtils.loadTexture(game.board);
        game.boardMap.minFilter = THREE.LinearFilter;

        world.universalLoad( game.url, function(sceneObj) {

            console.log(sceneObj);

            game.scene = sceneObj;

            //world.setScene(sceneObj);

            setGame(game);

        });

    }

    //Game already loaded
    else {

        setGame(game);

    }

}


//Set game from gameObj {}

function setGame( gameObj ) {

    if( CurrentGame ) {

        var objectLen = CurrentGame.currentObjects.length;

        for( var i = 0; i < objectLen; i++ ) {

            var child = CurrentGame.currentObjects[i];
            world.removeObject(child);

        }

        CurrentGame.currentObjects = [];

    }

    gameObj.scene.traverse(function(child) {

        if( child instanceof THREE.Mesh ) {

            child = child.clone();

            child.mass = 1;
            child.position.y += 95;
            child.castShadow = true;
            child.receiveShadow = true;

            world.addMesh(child);
            gameObj.currentObjects.push(child);

        }

        else if( child instanceof THREE.Light ) {

            world.addLight(child);

        }

    });

    plane.material.map = gameObj.boardMap;
    plane.material.needsUpdate = true;

    gameObj.loaded = true;
    CurrentGame = gameObj;

};
