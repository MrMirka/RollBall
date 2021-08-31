
            import { GLTFLoader } from '/threejs-dev/examples/jsm/loaders/GLTFLoader.js';
			import { OrbitControls } from '/threejs-dev/examples/jsm/controls/OrbitControls.js';
            import { RGBELoader } from '/threejs-dev/examples/jsm/loaders/RGBELoader.js';
            import { RoughnessMipmapper } from '/threejs-dev/examples/jsm/utils/RoughnessMipmapper.js';

            var clock = new THREE.Clock(); //Системные часы
            var GoBall = false; //Состояник качения
            var ScrollUP=false; //Скролл вверх
            var ScrollDown=false; //Скролл вниз
            var frameTimer=1; //Счетчик кадров
            var shadowMesh; //Тень сферы
            var BallSize=0;//Размер меча в пикселях
           
            //Path's
            const BallPath = '/mesh/ball-lp5.glb';
            const HdriPath = '/img/studio_small_04_256.hdr';
            const ShadowOfBallPath = '/img/shadow.png';

            const calculateFov = 34.2;
            const calculatePixels = 200; //Исходя из этого значения рассчитывается, какое долдно быть FOV, что бы видимый размер мяча составлял это значение

            const renderer = new THREE.WebGLRenderer({alpha: true });
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera( calculateFov, window.innerWidth / window.innerHeight, 0.1, 1000 );
            
            init();
            loadMesh();

            function init(){    
                //++++++++++++++++++++++++++++++++
		    	renderer.setSize( window.innerWidth, window.innerHeight );
		    	renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
		    	renderer.shadowMap.enabled = true;
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
			    renderer.toneMappingExposure = 1;
			    renderer.outputEncoding = THREE.sRGBEncoding;
			    document.body.appendChild( renderer.domElement );
                
                //set ligth
                const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.7 );
                directionalLight.position.set( 2, 8, 4 );
                directionalLight.shadow.mapSize.width = 2048; 
                directionalLight.shadow.mapSize.height = 2048; 
                directionalLight.shadow.radius = 20;
                directionalLight.shadow.camera.far = 20;
                //scene.add( directionalLight );

                const light = new THREE.AmbientLight( 0x404040 ); // soft white light
                scene.add( light ); 

                //+++++++++++++++++++++SHADOW IMAGE TEXTURE LOADER++++++++++++++++++++++++++++
                const textureLoader = new THREE.TextureLoader();
                const blendings = [
                        { name: 'No', constant: THREE.NoBlending },
                        { name: 'Normal', constant: THREE.NormalBlending },
                        { name: 'Additive', constant: THREE.AdditiveBlending },
                        { name: 'Subtractive', constant: THREE.SubtractiveBlending },
                        { name: 'Multiply', constant: THREE.MultiplyBlending }
                    ];

                const map = textureLoader.load( ShadowOfBallPath );	
                const geo = new THREE.PlaneGeometry( 1.3, 1.3 );
                addImage(map);


                function addImage( map) {
                        const blending = blendings[ 1 ];
                        const material = new THREE.MeshBasicMaterial( { map: map } );
                        material.transparent = true;
                        material.blending = blending.constant;
                        shadowMesh = new THREE.Mesh( geo, material );
                        shadowMesh.position.set( 0, -0.2, 0 );
                        shadowMesh.rotation.x = -1.5708;
                        scene.add( shadowMesh );		
                }



                
                //set camera position
                camera.rotation.x=-1.5708;
		    	camera.position.set( 0, 20 , 0 );
                renderer.render( scene, camera );
            }

            function loadMesh(){
                const meshLoader = new GLTFLoader();
                const roughnessMipmapper = new RoughnessMipmapper( renderer );
                meshLoader.load( BallPath, function ( gltf ) { 
				gltf.scene.name = 'ball';
				gltf.scene.traverse( function( node ) {
					if ( node.isMesh ) {
						roughnessMipmapper.generateMipmaps( node.material );
                        var bbox = new THREE.Box3().setFromObject(node);
                        var cent = bbox.getCenter(new THREE.Vector3());
                        var size = bbox.getSize(new THREE.Vector3());
                        console.log("Real size in unit "+size.x +" "+size.y+ " "+size.z);
                        console.log("FOV "+ getFovByPixels(calculatePixels, size.y));
                        getVisibleBallSize(size.y);
                    
                    }
				} );

                gltf.scene.position.y=-10;
                

                scene.add( gltf.scene );
                renderer.render( scene, camera );

                //Set HDRI
                const hdri = new RGBELoader();
				hdri.load( HdriPath, function ( texture ) {
					texture.mapping = THREE.EquirectangularReflectionMapping;
					scene.environment = texture;
					renderer.render( scene, camera );
				});

                const animate = function () {
                    
                    if(GoBall){
                       if(ScrollUP){     
                        gltf.scene.rotation.x=CubicInOut(frameTimer,0,getRotationCount(),60);
                        //gltf.scene.rotation.x+=getRotationCount()/60;
                       }else if(ScrollDown){
                       //gltf.scene.rotation.x-=getRotationCount()/60;
                        gltf.scene.rotation.x=getRotationCount()-CubicInOut(frameTimer,0,getRotationCount(),60);
                       }
                       frameTimer+=1;
                       //При анимации дольше 1 сек останавливаем кручение мяча и обнудяем все триггеры
                       if(clock.getElapsedTime()>1){
                            GoBall=false;
                            ScrollUP=false;
                            ScrollDown=false; 
                            frameTimer=1;
                       }
                    }
                    
                    requestAnimationFrame( animate );
                    renderer.render( scene, camera );
                }

                animate();

                window.addEventListener("wheel", function(e) {
                        if(isUp(e.deltaY)){
                            ScrollUP=true;
                            ScrollDown=false;
                        }else{
                            ScrollUP=false;
                            ScrollDown=true;
                        }
                        if(!GoBall){    
                             clock.start();	
                             GoBall=true;
                        }	
						}, true);
                
                }, undefined, function ( error ) {
                     console.error( error );	
               });
               
             }

             window.addEventListener("resize", function(e) {
                    UpdateWindow();
						}, true);       

             //Проверка направления скролла
             function isUp(deltaY){
                if(deltaY>0) {
                    return true;
                }else {
                    return false;
                }
	    	};

          

            //t - current time
            //b - start value
            //c - change value
            //d - duration
            function CubicInOut(t, b, c, d){
                if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
                return c / 2 * ((t -= 2) * t * t + 2) + b;
            }

            //Вычисляем количество оборотов мяча
            function getRotationCount(){
                return (window.innerHeight/getLengthBall(BallSize/2))*6.28319;
            }

            //Вычесляет длинну окружности
            function getLengthBall(radius) {
                let volume=0;
                volume = 2*Math.PI*radius;
                return volume;
            }
            //Обновляет значения при маштабировании окна
            function UpdateWindow(){
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize( window.innerWidth, window.innerHeight );
            }


            //Высчитывает видимый размер мяча
            //height = 2 * Math.tan( vFOV / 2 ) * distance
            //distanse - расстояние от камеры то ближайщей грани объекта
            //realseze - размер мяча в юнитах
            function getVisibleBallSize(realSize){
                var vFOV = THREE.MathUtils.degToRad( camera.fov ); 
                let distance = camera.position.y-(-10)-(realSize/2);
                var height = 2 * Math.tan( vFOV/2  ) * distance; 
                let fraction = realSize/height;
                BallSize = window.innerHeight*fraction;
                console.log("Canvas size higth in pixel "+window.innerHeight);
                console.log("Visible size in pixel "+BallSize);
                console.log("TEST TEST TEst")
            }

            //Получаем значение Fov для конкретного размера мяча в пикселях
            function getFovByPixels(pixel, realSize){
                let fraction = pixel/window.innerHeight;
                let height = realSize/fraction;
                let distance = camera.position.y-(-10)-(realSize/2);
                let fov = 2*(Math.PI + Math.atan( height / (2*distance)));
                return THREE.MathUtils.radToDeg(fov)-360;
            }

             
 