angular.module('gridPage', [])
.constant('MODULE_VERSION', '0.0.2')
.constant('gridDefaults', {
    size: 25,
    pageClasses: ""
})
.directive('gridPageComponent', function() {
    return {
        replace: true,
        template: '<div  ng-class="{\'grid-component\': true, \'mutable\': component.mutable}" ng-style="{\'position\': \'absolute\', \'width\': component.width + \'px\', \'height\': component.height + \'px\', \'top\': component.y + \'px\', \'left\': component.x + \'px\'}"></div>',
        controller: function($scope, $compile, $element){
            var compiledContent = $compile($scope.component.template)($scope);
            $element.append(compiledContent);
        }
    };
})
.directive('gridPage', function () {
    return {
        replace: true,
        template: '<div class="grid-pages">' +
            '<div ng-repeat="page in state.pages track by $index" data-page-number="{{$index}}" class="grid-page {{state.gridOptions.pageClasses}}">' +
            '<grid-page-component ng-repeat="component in page track by $index" ng-if="!component.deleted"></grid-page-component>' +
            '</div>' +
            '</div>',
        scope: {
            'gridOptions': '=?',
            'ready': '=?',
            'onComponentChange': '=?'
        },
        controller: function ($scope, $element, $timeout, gridDefaults) {

            // Components: {
            //    width: required
            //    height: required
            //    x: (if placing)
            //    y: (if placing)
            //    template: required
            //    page: (if placing)
            //    mutable: true/false 
            // }
            // (All items in Pages have all fields filled)


            $scope.state = {
                gridOptions: $scope.gridOptions || {},
                pages: [
                    []
                ],
                activeComponent: null,
                activeComponentDiv: null,
                validPosition: null,
                activePage: null,
                activePageOrigin: null,
                pageWidth: 0,
                pageHeight: 0
            };

            $scope.control = {
                init: function () {
                    $scope.state.gridOptions = angular.extend({}, gridDefaults, $scope.state.gridOptions);
                    $timeout(function () {
                        $scope.state.pageWidth = $element.find(".grid-page")
                            .width();
                        $scope.state.pageHeight = $element.find(".grid-page")
                            .height();
                        $scope.control.allowModification();
                        $scope.control.initListeners();
                        if (angular.isDefined($scope.ready)) {                                
                            $scope.ready($scope.state, $scope.control);
                        }
                    });
                },
                initListeners: function () {
                    $scope.$on("grid-page-component-deleted", function(ev, component) {
                        $scope.control.removeComponent(component);
                    });
                },
                // Broadcast a change
                broadcastChange: function () {
                    $scope.$broadcast("grid-page-changed", $scope.state.activeComponent);
                    if (angular.isDefined($scope.onComponentChange)) {
                        $scope.onComponentChange($scope.state.activeComponent);
                    }
                },
                // Adds a component at a given x/y/page
                placeComponent: function (component) {
                    var pages = $scope.state.pages;
                    for (var i = pages.length; i <= component.page; i++) {
                        pages.push([]);
                    }

                    $scope.state.pages[component.page].push(component);
                    $scope.control.snapToGrid(component);
                    console.log(pages)
                },
                // Adds a component at next available spot
                appendComponent: function (component, startPage) {
                    var pages = $scope.state.pages;
                    var width = $scope.state.pageWidth;
                    var height = $scope.state.pageHeight;
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
                },
                removeComponent: function (component) {
                    component.deleted = true;
                },
                addPage: function() {
                    $scope.state.pages.push([]);
                },
                // Check if a location is valid for a component
                canPlace: function (x, y, newComp, page, width, height) {
                    return page.every(function (component) {
                            if (component === newComp || component.deleted) {
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
                    var pageWidth = $scope.state.pageWidth;
                    var pageHeight = $scope.state.pageHeight;
                    var gridSize = $scope.state.gridOptions.size;

                    component.x = Math.max(component.x, 0);
                    component.y = Math.max(component.y, 0);

                    component.x = Math.min(component.x, pageWidth - component.width);
                    component.y = Math.min(component.y, pageHeight - component.height);


                    component.width = $scope.control.round(component.width);
                    component.height = $scope.control.round(component.height);
                    component.x = $scope.control.round(component.x);
                    component.y = $scope.control.round(component.y);
                    if(component.x + component.width > pageWidth) {
                        component.x -= gridSize;
                    }
                    if(component.y + component.height > pageHeight) {
                        component.y -= gridSize;
                    }
                },
                allowModification: function () {
                    interact('.mutable')
                        .draggable({
                            max: 1,
                            inertia: true,
                            restrict: {
                                restriction: '.grid-pages',
                                endOnly: true,
                                elementRect: {
                                    top: 0,
                                    left: 0,
                                    bottom: 1,
                                    right: 1
                                }
                            },
                            autoScroll: true,
                            onstart: function (event) {
                                $scope.state.activeComponentDiv = $(event.target);
                                $scope.state.activeComponent = angular.element(event.target)
                                    .scope()
                                    .component;
                                event.target.style['z-index'] = 9999;
                                $scope.state.activePage = $scope.state.pages.filter(function (page) {
                                    return page.indexOf($scope.state.activeComponent) > -1;
                                })[0];
                                event.target.setAttribute('data-initial-x', $scope.state.activeComponent.x);
                                event.target.setAttribute('data-initial-y', $scope.state.activeComponent.y);
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
                                var newX = component.x + (parseFloat(target.getAttribute('data-x')) || 0);
                                var newY = component.y + (parseFloat(target.getAttribute('data-y')) || 0);
                                component.x = newX;
                                component.y = newY;
                                
                                target.setAttribute('data-x', 0);
                                target.setAttribute('data-y', 0);
                                $scope.$evalAsync(function (scope) {
                                    scope.control.snapToGrid(scope.state.activeComponent);    
                                    target.style.webkitTransform =
                                    target.style.transform = '';
                                    if (!$scope.control.canPlace(component.x, component.y, component, activePage, $scope.state.pageWidth, $scope.state.pageHeight)) {
                                        component.x = parseFloat(target.getAttribute('data-initial-x'));
                                        component.y = parseFloat(target.getAttribute('data-initial-y'));
                                    }
                                    scope.control.broadcastChange();
                                });
                                target.style['z-index'] = 'auto';
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
                                component.width = (parseFloat(target.getAttribute('data-width')) || component.width);
                                component.height = (parseFloat(target.getAttribute('data-height')) || component.height);
                                $scope.$evalAsync(function (scope) {
                                    scope.control.snapToGrid(scope.state.activeComponent);
                                    scope.control.broadcastChange();
                                });
                            }
                        });
                    interact('.grid-page')
                        .dropzone({
                            accept: ".grid-component",
                            overlap: .5,
                            ondrop: function(event) {
                                var activeComponent = $scope.state.activeComponent;
                                var activeComponentDiv = $scope.state.activeComponentDiv;
                                var target = event.target;
                                var pageNumber = parseInt(target.getAttribute('data-page-number'));
                                if(pageNumber !== activeComponent.page && activeComponentDiv) {
                                    var newComp = angular.copy(activeComponent);
                                    newComp.page = pageNumber;
                                    newComp.unsaved = true;
                                    newComp.y =  activeComponentDiv.offset().top - $(target).offset().top;
                                    newComp.x = activeComponentDiv.offset().left - $(target).offset().left;
                                    $scope.control.snapToGrid(newComp);
                                    $scope.control.placeComponent(newComp);
                                    $scope.control.removeComponent(activeComponent);
                                    $scope.control.broadcastChange();
                                }
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
});