var ROOM3 = ROOM3 || {};

TWEEN.start();

ROOM3.Room = function (container) {
    this.container = container;

    this.init = function (options) {
        var settings = $.extend(true, {
            width: window.innerWidth,
            height: window.innerHeight,
            renderer: {
                antialias: true,
                shadowMapEnabled: true,
                shadowMapSoft: true
            },
            camera: {
                fov: 45,
                aspect: window.innerWidth / window.innerHeight,
                near: 1,
                far: 1000,
                position: { x: 60, y: 50, z: 60 }
            },
            light: {
                color: 0xFFFFFF,
                castShadow: true,
                shadowCameraLeft: -25,
                shadowCameraTop: -25,
                shadowCameraRight: 25,
                shadowCameraBottom: 25,
                shadowBias: -0.0001,
                position: { x: 40, y: 40, z: 25 }
            },
            ground: {
                width: 50,
                height: 50,
                color: 0x808080,
                receiveShadow: true
            }
        }, options);

        // create renderer
        var renderer = new THREE.WebGLRenderer({
            preserveDrawingBuffer: true,  // required for taking screenshots
            antialias: settings.renderer.antialias
        });
        renderer.shadowMapEnabled = settings.renderer.shadowMapEnabled;
        renderer.shadowMapSoft = settings.renderer.shadowMapSoft;
        renderer.setSize(settings.width, settings.height);
        this.container.append(renderer.domElement);
        this.renderer = renderer;

        // create scene
        var scene = new THREE.Scene();
        this.scene = scene;

        // create a camera
        var camera = new THREE.PerspectiveCamera(settings.camera.fov,
                                                 settings.camera.aspect,
                                                 settings.camera.near,
                                                 settings.camera.far);
        camera.position.set(settings.camera.position.x,
                            settings.camera.position.y,
                            settings.camera.position.z);
        camera.lookAt(scene.position);
        this.scene.add(camera);
        this.camera = camera;

        this.controls = new THREE.SphereControls(this.camera, this.container[0], 100);

        // add a light
        var light = new THREE.DirectionalLight(settings.light.color);
        light.position.set(settings.light.position.x,
                           settings.light.position.y,
                           settings.light.position.z);
        light.target.position.copy(this.scene.position);
        light.castShadow = settings.light.castShadow;
        light.shadowCameraLeft = settings.light.shadowCameraLeft;
        light.shadowCameraTop = settings.light.shadowCameraTop;
        light.shadowCameraRight = settings.light.shadowCameraRight;
        light.shadowCameraBottom = settings.light.shadowCameraBottom;
        light.shadowBias = settings.light.shadowBias;
        this.scene.add(light);
        this.light = light;

        // ground
        var ground = new THREE.Mesh(new THREE.PlaneGeometry(settings.ground.width, settings.ground.height),
                                    new THREE.MeshLambertMaterial({
                                        color: settings.ground.color
                                    }));
        ground.receiveShadow = settings.ground.receiveShadow;
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
        this.ground = ground;

        // objects in the scene
        this.objects = [];

        // physical world
        var collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
        var dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
        var overlappingPairCache = new Ammo.btDbvtBroadphase();
        var solver = new Ammo.btSequentialImpulseConstraintSolver();
        var world = new Ammo.btDiscreteDynamicsWorld(dispatcher,
                                                     overlappingPairCache,
                                                     solver,
                                                     collisionConfiguration);
        world.setGravity(new Ammo.btVector3(0, -12, 0));
        this.world = world;

        // ground physics
        var groundShape = new Ammo.btBoxShape(new Ammo.btVector3(settings.ground.width/2,
                                                                 1,
                                                                 settings.ground.height/2));
        var groundTransform = new Ammo.btTransform();
        groundTransform.setIdentity();
        groundTransform.setOrigin(new Ammo.btVector3(0, -1, 0));
        var groundMass = 0;
        var localInertia = new Ammo.btVector3(0, 0, 0);
        var motionState = new Ammo.btDefaultMotionState(groundTransform);
        var rbInfo = new Ammo.btRigidBodyConstructionInfo(groundMass,
                                                          motionState,
                                                          groundShape,
                                                          localInertia);
        var groundAmmo = new Ammo.btRigidBody(rbInfo);
        this.world.addRigidBody(groundAmmo);
    };

    return this;
};

ROOM3.Room.prototype = {
    addBox: function (options) {
        var settings = $.extend(true, {
            color: ROOM3.getRandomColorName(),
            position: {
                x: Math.random() * 10 - 5,
                y: 20,
                z: Math.random() * 10 - 5
            }
        }, options);

        var color = ROOM3.getColorByName(settings.color);

        var box = new THREE.Mesh(
                new THREE.CubeGeometry(3, 3, 3),
                new THREE.MeshLambertMaterial({ opacity: 0, transparent: true }));
        box.material.color.setRGB(color.r, color.g, color.b);
        box.castShadow = true;
        box.receiveShadow = true;
        box.useQuaternion = true;
        this.scene.add(box);

        new TWEEN.Tween(box.material).to({ opacity: 1 }, 500).start();

        var mass = 3 * 3 * 3;
        var startTransform = new Ammo.btTransform();
        startTransform.setIdentity();
        startTransform.setOrigin(new Ammo.btVector3(settings.position.x,
                                                    settings.position.y,
                                                    settings.position.z));

        var localInertia = new Ammo.btVector3(0, 0, 0);

        var boxShape = new Ammo.btBoxShape(new Ammo.btVector3(1.5, 1.5, 1.5));
        boxShape.calculateLocalInertia(mass, localInertia);

        var motionState = new Ammo.btDefaultMotionState(startTransform);
        var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, boxShape, localInertia);
        var boxAmmo = new Ammo.btRigidBody(rbInfo);
        this.world.addRigidBody(boxAmmo);

        boxAmmo.mesh = box;
        this.objects.push(boxAmmo);
    },

    addSphere: function (options) {
        var settings = $.extend(true, {
            color: ROOM3.getRandomColorName(),
            position: {
                x: Math.random() * 10 - 5,
                y: 20,
                z: Math.random() * 10 - 5
            }
        }, options);

        var color = ROOM3.getColorByName(settings.color);

        var sphere = new THREE.Mesh(
                new THREE.SphereGeometry(1.5),
                new THREE.MeshLambertMaterial({ opacity: 0, transparent: true }));
        sphere.material.color.setRGB(color.r, color.g, color.b);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        sphere.useQuaternion = true;
        this.scene.add(sphere);

        new TWEEN.Tween(sphere.material).to({ opacity: 1 }, 500).start();

        var mass = 3 * 3 * 3;
        var startTransform = new Ammo.btTransform();
        startTransform.setIdentity();
        startTransform.setOrigin(new Ammo.btVector3(settings.position.x,
                                                    settings.position.y,
                                                    settings.position.z));

        var localInertia = new Ammo.btVector3(0, 0, 0);

        var sphereShape = new Ammo.btSphereShape(1.5);
        sphereShape.calculateLocalInertia(mass, localInertia);

        var motionState = new Ammo.btDefaultMotionState(startTransform);
        var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, sphereShape, localInertia);
        var sphereAmmo = new Ammo.btRigidBody(rbInfo);
        this.world.addRigidBody(sphereAmmo);

        sphereAmmo.mesh = sphere;
        this.objects.push(sphereAmmo);
    },

    addCylinder: function (options) {
        var settings = $.extend(true, {
            color: ROOM3.getRandomColorName(),
            position: {
                x: Math.random() * 10 - 5,
                y: 20,
                z: Math.random() * 10 - 5
            }
        }, options);

        var color = ROOM3.getColorByName(settings.color);

        var cylinder = new THREE.Mesh(
                new THREE.CylinderGeometry(1.5, 1.5, 3),
                new THREE.MeshLambertMaterial({ opacity: 0, transparent: true }));
        cylinder.material.color.setRGB(color.r, color.g, color.b);
        cylinder.castShadow = true;
        cylinder.receiveShadow = true;
        cylinder.useQuaternion = true;
        this.scene.add(cylinder);

        new TWEEN.Tween(cylinder.material).to({ opacity: 1}, 500).start();

        var mass = 3 * 3 * 3;
        var startTransform = new Ammo.btTransform();
        startTransform.setIdentity();
        startTransform.setOrigin(new Ammo.btVector3(settings.position.x,
                                                    settings.position.y,
                                                    settings.position.z));

        var localInertia = new Ammo.btVector3(0, 0, 0);

        var cylinderShape = new Ammo.btCylinderShape(new Ammo.btVector3(1.5, 1.5, 1.5));
        cylinderShape.calculateLocalInertia(mass, localInertia);

        var motionState = new Ammo.btDefaultMotionState(startTransform);
        var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, cylinderShape, localInertia);
        var cylinderAmmo = new Ammo.btRigidBody(rbInfo);
        this.world.addRigidBody(cylinderAmmo);

        cylinderAmmo.mesh = cylinder;
        this.objects.push(cylinderAmmo);
    },

    render: function () {
        this.renderer.render(this.scene, this.camera);
    },

    updateObjects: function () {
        this.world.stepSimulation(1/60, 5);
        var transform = new Ammo.btTransform();

        for (var i = 0; i < this.objects.length; i++) {
            this.objects[i].getMotionState().getWorldTransform(transform);

            var origin = transform.getOrigin();
            this.objects[i].mesh.position.x = origin.x();
            this.objects[i].mesh.position.y = origin.y();
            this.objects[i].mesh.position.z = origin.z();

            var rotation = transform.getRotation();
            this.objects[i].mesh.quaternion.x = rotation.x();
            this.objects[i].mesh.quaternion.y = rotation.y();
            this.objects[i].mesh.quaternion.z = rotation.z();
            this.objects[i].mesh.quaternion.w = rotation.w();
        }
    },

    animate: function () {
        var that = this;
        var anim = function () {
            that.controls.update();
            that.updateObjects();
            that.render();
            requestAnimationFrame(anim);
        };
        requestAnimationFrame(anim);
    },

    toDataURL: function (mimetype) {
        var mimetype = mimetype || 'image/png';
        return this.renderer.domElement.toDataURL(mimetype);
    },

    toJSON: function (key) {
        var data = [{
            type: "perspective_camera",
            near: this.camera.near,
            far: this.camera.far,
            fov: this.camera.fov,
            aspect: this.camera.aspect,
            lookAt: { x:0, y:0, z:0 },
            position: {
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z
            },
            rotation: {
                x: this.camera.rotation.x,
                y: this.camera.rotation.y,
                z: this.camera.rotation.z
            }
        }];

        for (var i in this.objects) {
            var m = this.objects[i].mesh;
            m.geometry.computeBoundingBox();

            var type;
            if (m.geometry.constructor === THREE.CubeGeometry) {
                type = 'cube';
            } else if (m.geometry.constructor === THREE.SphereGeometry) {
                type = 'sphere';
            } else if (m.geometry.constructor === THREE.CylinderGeometry) {
                type = 'cylinder';
            }

            data.push({
                type: type,
                position: {
                    x: m.position.x,
                    y: m.position.y,
                    z: m.position.z
                },
                quaternion: {
                    x: m.quaternion.x,
                    y: m.quaternion.y,
                    z: m.quaternion.z,
                    w: m.quaternion.w
                },
                color: {
                    r: m.material.color.r,
                    g: m.material.color.g,
                    b: m.material.color.b
                },
                bounding_box: {
                    min: {
                        x: m.geometry.boundingBox.min.x,
                        y: m.geometry.boundingBox.min.y,
                        z: m.geometry.boundingBox.min.z
                    },
                    max: {
                        x: m.geometry.boundingBox.max.x,
                        y: m.geometry.boundingBox.max.y,
                        z: m.geometry.boundingBox.max.z
                    }
                }
            });
        }
        return JSON.stringify(data, null, 4);
    }
}
