var ROOM3 = ROOM3 || {};

TWEEN.start();

ROOM3.Room = function (container) {
    this.container = container;

    this.init = function (options) {
        var settings = $.extend(true, {
            width: window.innerWidth - 50,
            height: window.innerHeight,
            renderer: {
                antialias: true,
                shadowMapEnabled: true,
                shadowMapSoft: true
            },
            camera: {
                fov: 45,
                aspect: (window.innerWidth-50) / (window.innerHeight),
                near: 1,
                far: 1000,
                position: { x: 60, y: 50, z: 60 }
            },
            light: {
                color: 0xFFFFFF,
                castShadow: true,
                shadowCameraLeft: -55,
                shadowCameraTop: -55,
                shadowCameraRight: 55,
                shadowCameraBottom: 55,
                shadowBias: -0.0001,
                position: { x: 60, y: 70, z: 80 }
            },
            ground: {
                width: 100,
                height: 100,
                color: 0xDDDDDD,
                receiveShadow: true
            }
        }, options);

        this.animate_objects = true;

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

        this.projector = new THREE.Projector();
        this.controls = new THREE.SphereControls(this.camera,
                                                 this.container[0],
                                                 100);

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
        var ground = new THREE.Mesh(
                new THREE.PlaneGeometry(settings.ground.width,
                                        settings.ground.height),
                new THREE.MeshLambertMaterial({color:settings.ground.color})
        );
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
        var groundShape = new Ammo.btBoxShape(
                new Ammo.btVector3(settings.ground.width/2,
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

    var that = this;
    var object_data = $('#object_data').dialog({
        autoOpen: false,
        close: function () {
            $(this).html('');
        }
    });
    $(this.container).click(function (e) {
        if (e.ctrlKey) return;
        if (that.objects.length === 0) return;
        e.preventDefault();
        // mouse coordinates relative to container
        var x = e.clientX - this.offsetLeft;
        var y = e.clientY - this.offsetTop;
        var width = that.container.width();
        var height = that.container.height();
        // normalized device coordinates
        var vector = new THREE.Vector3(x/width*2-1, -y/height*2+1);
        var ray = that.projector.pickingRay(vector, that.camera);
        // FIXME we shouldn't have to build this array every time
        var objects = [];
        for (var i in that.objects) {
            objects.push(that.objects[i].mesh);
        }
        var intersects = ray.intersectObjects(objects);
        if (intersects.length > 0) {
            var idx = $.inArray(intersects[0].object, objects);
            var shape, m = objects[idx];
            if (m.geometry.constructor === THREE.CubeGeometry) {
                shape = 'cube';
            } else if (m.geometry.constructor === THREE.SphereGeometry) {
                shape = 'sphere';
            } else if (m.geometry.constructor === THREE.CylinderGeometry) {
                shape = 'cylinder';
            }
            object_data.html('index: ' + idx + '<br>' +
                             'shape: ' + shape + '<br>' +
                             'color: ' + that.objects[idx].settings.color);
            object_data.dialog('open');
        }
    });

    return this;
};

ROOM3.Room.prototype = {
    addBox: function (options) {
        var settings = $.extend(true, {
            width: Math.random() * 10 + 1,
            height: Math.random() * 10 + 1,
            depth: Math.random() * 10 + 1,
            color: ROOM3.getRandomColorName(),
            position: {
                x: Math.random() * 50 - 25,
                y: 20,
                z: Math.random() * 50 - 25
            }
        }, options);

        var color = ROOM3.getColorByName(settings.color);

        var box = new THREE.Mesh(
                new THREE.CubeGeometry(settings.width,
                                       settings.height,
                                       settings.depth),
                new THREE.MeshLambertMaterial({ opacity: 0, transparent: true }));
        box.material.color.setRGB(color.r, color.g, color.b);
        box.castShadow = true;
        box.receiveShadow = true;
        box.useQuaternion = true;
        this.scene.add(box);

        new TWEEN.Tween(box.material).to({ opacity: 1 }, 500).start();

        var mass = settings.width * settings.height * settings.depth;
        var startTransform = new Ammo.btTransform();
        startTransform.setIdentity();
        startTransform.setOrigin(new Ammo.btVector3(settings.position.x,
                                                    settings.position.y,
                                                    settings.position.z));

        var localInertia = new Ammo.btVector3(0, 0, 0);

        var boxShape = new Ammo.btBoxShape(new Ammo.btVector3(settings.width/2,
                                                              settings.height/2,
                                                              settings.depth/2));
        boxShape.calculateLocalInertia(mass, localInertia);

        var motionState = new Ammo.btDefaultMotionState(startTransform);
        var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, boxShape, localInertia);
        var boxAmmo = new Ammo.btRigidBody(rbInfo);
        this.world.addRigidBody(boxAmmo);

        boxAmmo.mesh = box;
        boxAmmo.settings = settings;
        this.objects.push(boxAmmo);
    },

    addSphere: function (options) {
        var settings = $.extend(true, {
            radius: Math.random() * 5 + 1,
            color: ROOM3.getRandomColorName(),
            segmentsWidth: 50,
            segmentsHeight: 50,
            position: {
                x: Math.random() * 50 - 25,
                y: 20,
                z: Math.random() * 50 - 25
            }
        }, options);

        var color = ROOM3.getColorByName(settings.color);

        var sphere = new THREE.Mesh(
                new THREE.SphereGeometry(settings.radius,
                                         settings.segmentsWidth,
                                         settings.segmentsHeight),
                new THREE.MeshLambertMaterial({ opacity: 0, transparent: true }));
        sphere.material.color.setRGB(color.r, color.g, color.b);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        sphere.useQuaternion = true;
        this.scene.add(sphere);

        new TWEEN.Tween(sphere.material).to({ opacity: 1 }, 500).start();

        var mass = (4/3) * Math.PI * Math.pow(settings.radius, 3);
        var startTransform = new Ammo.btTransform();
        startTransform.setIdentity();
        startTransform.setOrigin(new Ammo.btVector3(settings.position.x,
                                                    settings.position.y,
                                                    settings.position.z));

        var localInertia = new Ammo.btVector3(0, 0, 0);

        var sphereShape = new Ammo.btSphereShape(settings.radius);
        sphereShape.calculateLocalInertia(mass, localInertia);

        var motionState = new Ammo.btDefaultMotionState(startTransform);
        var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, sphereShape, localInertia);
        var sphereAmmo = new Ammo.btRigidBody(rbInfo);
        this.world.addRigidBody(sphereAmmo);

        sphereAmmo.mesh = sphere;
        sphereAmmo.settings = settings;
        this.objects.push(sphereAmmo);
    },

    addCylinder: function (options) {
        var settings = $.extend(true, {
            radius: Math.random() * 5 + 1,
            height: Math.random() * 10 + 1,
            color: ROOM3.getRandomColorName(),
            segmentsRadius: 50,
            position: {
                x: Math.random() * 50 - 25,
                y: 20,
                z: Math.random() * 50 - 25
            }
        }, options);

        var color = ROOM3.getColorByName(settings.color);

        var cylinder = new THREE.Mesh(
                new THREE.CylinderGeometry(settings.radius,
                                           settings.radius,
                                           settings.height,
                                           settings.segmentsRadius),
                new THREE.MeshLambertMaterial({ opacity: 0, transparent: true }));
        cylinder.material.color.setRGB(color.r, color.g, color.b);
        cylinder.castShadow = true;
        cylinder.receiveShadow = true;
        cylinder.useQuaternion = true;
        this.scene.add(cylinder);

        new TWEEN.Tween(cylinder.material).to({ opacity: 1}, 500).start();

        var mass = Math.PI * Math.pow(settings.radius, 2) * settings.height;
        var startTransform = new Ammo.btTransform();
        startTransform.setIdentity();
        startTransform.setOrigin(new Ammo.btVector3(settings.position.x,
                                                    settings.position.y,
                                                    settings.position.z));

        var localInertia = new Ammo.btVector3(0, 0, 0);

        var cylinderShape = new Ammo.btCylinderShape(new Ammo.btVector3(settings.radius,
                                                                        settings.height/2,
                                                                        settings.radius));
        cylinderShape.calculateLocalInertia(mass, localInertia);

        var motionState = new Ammo.btDefaultMotionState(startTransform);
        var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, cylinderShape, localInertia);
        var cylinderAmmo = new Ammo.btRigidBody(rbInfo);
        this.world.addRigidBody(cylinderAmmo);

        cylinderAmmo.mesh = cylinder;
        cylinderAmmo.settings = settings;
        this.objects.push(cylinderAmmo);
    },

    render: function () {
        this.renderer.render(this.scene, this.camera);
    },

    updateObjects: function () {
        if (!this.animate_objects) {
            return;
        }

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
            var o = this.objects[i];

            var aabb_min = new Ammo.btVector3(0,0,0);
            var aabb_max = new Ammo.btVector3(0,0,0);
            o.getAabb(aabb_min, aabb_max);

            var m = o.mesh;
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
                settings: o.settings,
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
                },
                aabb: {
                    min: {
                        x: aabb_min.x(),
                        y: aabb_min.y(),
                        z: aabb_min.z()
                    },
                    max: {
                        x: aabb_max.x(),
                        y: aabb_max.y(),
                        z: aabb_max.z()
                    }
                }
            });
        }
        return JSON.stringify(data, null, 4);
    },

    emptyScene: function () {
        for (var i in this.objects) {
            var o = this.objects[i];
            this.world.removeRigidBody(o);
            this.scene.remove(o.mesh);
        }
        this.objects = [];
    },

    loadData: function (data) {
        this.animate_objects = false;
        this.emptyScene();

        // reset controls
        this.controls.theta = 45;
        this.controls.phi = 45;

        // reset camera
        var camera = data[0];
        this.camera.near = camera.near;
        this.camera.far = camera.far;
        this.camera.fov = camera.fov;
        this.camera.position.set(camera.position.x,
                                 camera.position.y,
                                 camera.position.z);
        this.camera.lookAt(new THREE.Vector3(0,0,0));
        this.camera.updateMatrix();

        // reset objects
        for (var i = 1; i < data.length; i++) {
            var o = data[i];
            if (o.type === "cube") {
                this.addBox(o.settings);
            }
            else if (o.type === "cylinder") {
                this.addCylinder(o.settings);
            }
            else if (o.type === "sphere") {
                this.addSphere(o.settings);
            }

            var mesh = this.objects[i-1].mesh;
            mesh.position.x = o.position.x;
            mesh.position.y = o.position.y;
            mesh.position.z = o.position.z;

            mesh.quaternion.x = o.quaternion.x;
            mesh.quaternion.y = o.quaternion.y;
            mesh.quaternion.z = o.quaternion.z;
            mesh.quaternion.w = o.quaternion.w;
        }
    }
}
