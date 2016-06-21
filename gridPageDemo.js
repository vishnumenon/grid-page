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
			template: "<div layout-fill> Hellooo </div>",
			page: 0,
			draggable: true
		});

		for(var i = 0; i < 2; i++) {
	 		gridControl.appendComponent({
				width: getRandomInt(100,200),
				height: getRandomInt(100,200),
				template: "<div layout-fill> Hellooo </div>",
				draggable: true
			}, getRandomInt(0,2));
 		}

 		gridControl.allowModification();
	} 
});	