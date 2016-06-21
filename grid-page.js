angular.module('gridPage', [])
.constant('MODULE_VERSION', '0.0.1')
.constant('gridDefaults', {
    size: 25,

})
.directive('gridPage', function () {
    return {
        replace: true,
        template: '<div class="grid-pages">' +
            '<div ng-repeat="page in state.pages" class="grid-page">' +
            '<div ng-repeat="component in page track by $index" data-uuid="{{component.uuid}}" ng-class="{\'grid-component\': true, \'draggable\': component.draggable}" ng-style="{\'position\': \'absolute\', \'width\': component.width + \'px\', \'height\': component.height + \'px\', \'top\': component.y + \'px\', \'left\': component.x + \'px\'}">' +
            '</div>' +
            '</div>' +
            '</div>',
        scope: {
            'gridOptions': '=?',
            'onGridLoad': '=?',
            'onComponentChange': '=?'
        },
        controller: function ($scope, $element, $timeout, $compile, gridDefaults) {

            // Components: {
            //	  uuid: a uuid, required
            // 	  width: required
            // 	  height: required
            // 	  x: (if placing)
            // 	  y: (if placing)
            // 	  template: required
            //	  page: (if placing)
            //	  draggable: true/false 
            // }
            // (All items in Pages have all fields filled)


            $scope.state = {
                gridOptions: $scope.gridOptions || {},
                pages: [
                    []
                ],
                activeComponent: null,
                validPosition: null,
                activePage: null,
                activePageOrigin: null,
                pageWidth: 0,
                pageHeight: 0
            };

            $scope.control = {
                init: function () {
                    angular.extend($scope.state.gridOptions, gridDefaults);
                    $element
                    if (angular.isDefined($scope.onGridLoad)) {
                        $timeout(function () {
                            $scope.state.pageWidth = $element.find(".grid-page")
                                .width();
                            $scope.state.pageHeight = $element.find(".grid-page")
                                .height();
                            $scope.onGridLoad($scope.state, $scope.control);
                        });
                    }
                },
                // Compiles component template
                compileComponent: function (component) {
                    $timeout(function () {
                        var compiledContent = $compile(component.template)($scope);
                        var elem = $element.find("[data-uuid=" + component.uuid + "]");
                        elem.append(compiledContent);
                    });
                },
                // Adds a component at a given x/y/page
                placeComponent: function (component) {
                    if (!component.uuid) {
                        component.uuid = Date.now();
                    }
                    var pages = $scope.state.pages;
                    for (var i = pages.length; i <= component.page; i++) {
                        pages.push([]);
                    }
                    $scope.state.pages[component.page].push(component);
                    $scope.control.snapToGrid(component);
                    $scope.control.compileComponent(component);
                },
                // Adds a component at next available spot
                appendComponent: function (component, startPage) {
                    if (!component.uuid) {
                        component.uuid = Date.now();
                    }
                    var pages = $scope.state.pages;
                    var height = $scope.state.pageHeight;
                    var width = $scope.state.pageWidth;
                    var step = $scope.state.gridOptions.size;
                    var added = pages.slice(startPage)
                        .some(function (page, i) {
                            for (var x = 0; x <= width - component.width; x = x + step) {
                                if ($scope.control.canPlace(x, 0, component, page, width, height)) {
                                    component.x = x;
                                    component.y = 0;
                                    component.page = i;
                                    page.push(component);
                                    return true;
                                }
                            }
                            var fitAdjacent = page.some(function (comp) {
                                for (var x = comp.x; x <= comp.x + comp.width; x = x + step) {
                                    if ($scope.control.canPlace(x, comp.y + comp.height, component, page, width, height)) {
                                        component.x = x;
                                        component.y = comp.y + comp.height;
                                        component.page = i;
                                        page.push(component);
                                        return true;
                                    }
                                }
                                return false;
                            });
                            return fitAdjacent;
                        });
                    if (!added) {
                        component.x = 0;
                        component.y = 0;
                        component.page = pages.length;
                        pages.push([component]);
                    }
                    $scope.control.snapToGrid(component);
                    $scope.control.compileComponent(component);
                },
                // Check if a location is valid for a component
                canPlace: function (x, y, newComp, page, width, height) {
                    return page.every(function (component) {
                            if (component === newComp) {
                                return true;
                            }
                            return (x + newComp.width <= component.x ||
                                x >= component.x + component.width ||
                                y + newComp.height <= component.y ||
                                y >= component.y + component.height);
                        }) && x + newComp.width < width &&
                        y + newComp.height < height;
                },
                round: function (value) {
                    return Math.round(value / $scope.state.gridOptions.size) * $scope.state.gridOptions.size;
                },
                snapToGrid: function (component) {
                    component.width = $scope.control.round(component.width);
                    component.height = $scope.control.round(component.height);
                    component.x = $scope.control.round(component.x);
                    component.y = $scope.control.round(component.y);
                },
                allowModification: function () {
                    interact('.draggable')
                        .draggable({
                            max: 1,
                            inertia: true,
                            restrict: {
                                restriction: '.grid-page',
                                endOnly: false,
                                elementRect: {
                                    top: 0,
                                    left: 0,
                                    bottom: 1,
                                    right: 1
                                }
                            },
                            autoScroll: true,
                            onstart: function (event) {
                                $scope.state.activeComponent = angular.element(event.target)
                                    .scope()
                                    .component;
                                $scope.state.activePage = $scope.state.pages.filter(function (page) {
                                    return page.indexOf($scope.state.activeComponent) > -1;
                                })[0];
                            },
                            onmove: function (event) {
                                var target = event.target,
                                    x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx,
                                    y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                                target.style.webkitTransform =
                                    target.style.transform =
                                    'translate(' + x + 'px, ' + y + 'px)';
                                target.setAttribute('data-x', x);
                                target.setAttribute('data-y', y);
                            },
                            onend: function (event) {
                                var target = event.target;
                                var component = $scope.state.activeComponent;
                                var activePage = $scope.state.activePage;
                                target.style.webkitTransform =
                                    target.style.transform = '';
                                var newX = component.x + (parseFloat(target.getAttribute('data-x')) || 0);
                                var newY = component.y + (parseFloat(target.getAttribute('data-y')) || 0);
                                if ($scope.control.canPlace(newX, newY, component, activePage, $scope.state.pageWidth, $scope.state.pageHeight)) {
                                    component.x = newX;
                                    component.y = newY;
                                    target.style.left = newX;
                                    target.style.top = newY;
                                }
                                target.setAttribute('data-x', 0);
                                target.setAttribute('data-y', 0);
                                $scope.$evalAsync(function (scope) {
                                    scope.control.snapToGrid(scope.state.activeComponent);
                                    if (angular.isDefined(scope.onComponentChange)) {
                                        scope.onComponentChange(scope.state.activeComponent);
                                    }
                                });
                            }
                        })
                        .resizable({
                            max: 1,
                            margin: 20,
                            preserveAspectRatio: false,
                            intertia: true,
                            autoScroll: true,
                            restrict: {
                                restriction: '.grid-page',
                                endOnly: false,
                                elementRect: {
                                    top: 1,
                                    left: 1,
                                    bottom: 1,
                                    right: 1
                                }
                            },
                            edges: {
                                left: false,
                                right: true,
                                bottom: true,
                                top: false
                            },
                            onstart: function (event) {
                                $scope.state.activeComponent = angular.element(event.target)
                                    .scope()
                                    .component;
                                $scope.state.activePage = $scope.state.pages.filter(function (page) {
                                    return page.indexOf($scope.state.activeComponent) > -1;
                                })[0];
                            },
                            onmove: function (event) {
                                var component = $scope.state.activeComponent;
                                var activePage = $scope.state.activePage;
                                var target = event.target;
                                target.style.width = event.rect.width + 'px';
                                target.style.height = event.rect.height + 'px';
                                component.width = event.rect.width;
                                component.height = event.rect.height;
                                if ($scope.control.canPlace(component.x, component.y, component, activePage, $scope.state.pageWidth, $scope.state.pageHeight)) {
                                    target.setAttribute('data-width', event.rect.width);
                                    target.setAttribute('data-height', event.rect.height);
                                }
                            },
                            onend: function (event) {
                                var target = event.target;
                                var component = $scope.state.activeComponent;
                                console.log(target);
                                component.width = (parseFloat(target.getAttribute('data-width')) || component.width);
                                component.height = (parseFloat(target.getAttribute('data-height')) || component.height);
                                target.style.width = component.width;
                                target.style.height = component.height
                                $scope.$evalAsync(function (scope) {
                                    scope.control.snapToGrid(scope.state.activeComponent);
                                    if (angular.isDefined(scope.onComponentChange)) {
                                        scope.onComponentChange(scope.state.activeComponent);
                                    }
                                });
                            }
                        });
                },
                serialize: function () {
                    return $scope.state;
                }
            };

            $scope.control.init();
        }
    };
})