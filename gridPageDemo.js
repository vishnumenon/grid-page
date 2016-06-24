var gridPageDemo = angular.module('gridPageDemo', ['gridPage']);

gridPageDemo.controller('DemoController', function DemoController($scope, $timeout) {
	function getRandomInt(min, max) {
	    return Math.floor(Math.random() * (max - min + 1)) + min;
	}


	$scope.gridCallback = function(gridState, gridControl) {
		gridControl.placeComponent({
			width: 50,
			height: 50,
			x: 50,
			y: 50,
			template: "<div style='width: 100%; height: 100%; background-color: yellow'> Hellooo </div>",
			page: 0,
			mutable: true
		});

		$scope.gridControl = gridControl;

 		gridControl.allowModification();
	} 

	$scope.addComponent = function() {
 		$scope.gridControl.appendComponent({
			width: getRandomInt(100,200),
			height: getRandomInt(100,200),
			template: "<div style='width: 100%; height: 100%;' ng-style=\"{'background-color':'yellow'}\"> Hellooo {{component}}</div>",
			mutable: true
		}, getRandomInt(0,0));
	}
});	