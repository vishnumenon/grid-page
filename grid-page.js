angular.module('gridPage', [])
.constant('MODULE_VERSION', '0.0.1')
.constant('gridDefaults', {
	size: 10,

})
.directive('gridPage', function() {
	return {
		template:'<div class="grid-pages">'
				+ 	'<div ng-repeat="page in state.pages" class="grid-page">'
				+ 		'<div ng-repeat="component in page track by $index" class="grid-component" ng-style="{\'position\': \'absolute\', \'width\': component.width + \'px\', \'height\': component.height + \'px\', \'top\': component.y + \'px\', \'left\': component.x + \'px\'}" draggable="{{component.draggable}}"><div style="background-color: grey; width: 100%; height: 100%">HIIIIII</div></div>' 
				+	'</div>'
				+'</div>',
		scope: {
			'gridOptions': '=?',
			'onGridLoad': '=?', 
			'onComponentChange': '=?'
		},
		controller: function($scope, $element, $timeout, gridDefaults) {

			// Components: {
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
				pages: [[]],
				activeComponent: null,
				validPosition: null,
				activePage: null,
				activePageOrigin: null,
				pageWidth: 0,
				pageHeight: 0
			};

			$scope.control = {
				init: function() {
					angular.extend($scope.state.gridOptions, gridDefaults);
					if(angular.isDefined($scope.onGridLoad)) {
						$timeout(function() {
							$scope.state.pageWidth = $element.find(".grid-page").width();
							$scope.state.pageHeight = $element.find(".grid-page").height();
							$scope.onGridLoad($scope.state, $scope.control);
						});
					}
				},
				// Adds a component at a given x/y/page
				placeComponent: function(component) {
					var pages = $scope.state.pages;
					for(var i = pages.length; i <= component.page; i++) {
						pages.push([]);
					}
					$scope.state.pages[component.page].push(component);
				},
				// Adds a component at next available spot
				appendComponent: function(component, startPage) {
					var pages = $scope.state.pages; 
					var height = $scope.state.pageHeight;
					var width = $scope.state.pageWidth;
					var step = $scope.state.gridOptions.size;
					var added = pages.slice(startPage).some(function(page, i) {
						for(var x = 0; x <= width - component.width; x = x + step) {
							if($scope.control.canPlace(x, 0, component, page, width, height)) {
								component.x = x;
								component.y = 0;
								component.page = i;
								page.push(component);
								return true;
							}
						}
						var fitAdjacent = page.some(function(comp) {
							for(var x = comp.x; x <= comp.x+comp.width; x = x + step) {
								if($scope.control.canPlace(x, comp.y + comp.height, component, page, width, height)) {
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
					if(!added) {
						component.x = 0;
						component.y = 0;
						component.page = pages.length;
						pages.push([component]);
					}
				},
				// Check if a location is valid for a component
				canPlace: function (x, y, newComp, page, width, height) {
					console.log("HII");
					return page.every(function(component) {
						if(component === newComp) {return true;}
						return (x + newComp.width <= component.x
							|| x >= component.x + component.width
							|| y + newComp.height <= component.y
							|| y >= component.y + component.height);
					}) 	&& x + newComp.width < width 
						&& y + newComp.height < height;
				},
				allowModification: function() {
					$element.find("[draggable=true]").on('dragstart', function(ev) {
						$scope.state.activeComponent = angular.element(ev.target).scope().component;
						$scope.state.activePageOrigin = $(ev.target).parent(".grid-page").offset();
						$scope.state.activePage = $scope.state.pages.filter(function(page) {return page.indexOf($scope.state.activeComponent) > -1;})[0];
						$scope.state.validPosition = {x: $scope.state.activeComponent.x, y: $scope.state.activeComponent.y};
					});
					$element.find("[draggable=true]").on('drag', function(ev) {
						var origin = $scope.state.activePageOrigin;
						var activePage = $scope.state.activePage;
						var activeComponent = $scope.state.activeComponent;
						var newX = ev.pageX - origin.left;
						var newY = ev.pageY - origin.top;
						if(!(newX && newY && newX >= 0 && newY >= 0)) {
							return;
						}
						$scope.state.activeComponent.x = newX;
						$scope.state.activeComponent.y = newY;
						$scope.$apply();
						if($scope.control.canPlace(newX, newY, activeComponent, activePage, $scope.state.pageWidth, $scope.state.pageHeight)) {
							$scope.state.validPosition = {x: newX, y: newY};
						}
					});
					$element.find("[draggable=true]").on('dragend', function(ev) {
						$scope.$apply(function() {
							$scope.state.activeComponent.x = $scope.state.validPosition.x;
							$scope.state.activeComponent.y = $scope.state.validPosition.y;
						});
						$scope.state.activeComponent = null;
					});

					$element.find(".grid-page").on('dragenter', function(ev) {

					});
					$element.find(".grid-page").on('dragover', function(ev) {
						ev.preventDefault();
					});
					$element.find(".grid-page").on('drop', function(ev) {
						ev.preventDefault();
					});
			
				},
				serialize: function() {
					return $scope.state;
				}
			};

			$scope.control.init();
		}
	};
})