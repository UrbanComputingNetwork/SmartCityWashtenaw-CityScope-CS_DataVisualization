queue()
    .defer(d3.json, "./input/Andorra/stayData.json")
    .await(drawCharts);

function drawCharts(error, pointData) {
	
	console.log(pointData)
	var records = pointData['data'];
	var multiplier= parseInt(pointData['multiplier']);
	var dateFormat = d3.time.format("%Y%m%d %H:%M:%S");
	
	records.forEach(function(d) {
		d["startTimestamp"] = dateFormat.parse(d["startTimestamp"]);
		d["endTimestamp"] = dateFormat.parse(d["endTimestamp"]);
		d["startTimestamp"].setSeconds(0);
		d["endTimestamp"].setSeconds(0);
		d['interval']=[d['startTimestamp'].getTime(), d['endTimestamp'].getTime()];
	});

function intervalTreeGroup(tree, firstDate, lastDate) {
      return {
          all: function() {
              var begin = d3.time.minute(firstDate), end = d3.time.minute(lastDate); //returns an interval
              var i = new Date(begin);
              var ret = [], count;
              do {
                  next = new Date(i);
                  next.setMinutes(next.getMinutes()+1);
                  count = 0;
                  tree.queryInterval(i.getTime(), next.getTime(), function() {
                      ++count;
                  });
                  ret.push({key: i, value: count});
                  i = next;
              }
              while(i.getTime() <= end.getTime());
              return ret;
          }
      };
  }

	
	var ndx = crossfilter(records);
	var dateDim = ndx.dimension(function(d) { return d["startTimestamp"]; });
	var minDate = dateDim.bottom(1)[0]["startTimestamp"];
	var maxDate = dateDim.top(1)[0]["endTimestamp"];

	var intervalDimension = ndx.dimension(function(d) {return d.interval;})
	var obsPerMinuteTree = ndx.groupAll().reduce(
              function(v, d) {
                  v.insert(d.interval);
                  return v;
              },
              function(v, d) {
                  v.remove(d.interval);
                  return v;
              },
              function() {
                  return lysenkoIntervalTree(null);
              }
          )

	var obsPerMinuteGroup = intervalTreeGroup(obsPerMinuteTree.value(), minDate, maxDate)

	


	var cellDim = ndx.dimension(function(d) { return d["Cell"]; });
	var nationDim = ndx.dimension(function(d) { return d["Nation"]; });
	var locationDim = ndx.dimension(function(d) { return d["Location"]; });
	var allDim = ndx.dimension(function(d) {return d;});

	 
	// use ending times

	var numRecordsByDate = dateDim.group();
	var cellGroup = cellDim.group();
	var nationGroup = nationDim.group();
	var locationGroup = locationDim.group();
	var all = ndx.groupAll();

    var total = dc.numberDisplay("#total");
	var timeChart = dc.barChart("#time-chart");
	var cellChart = dc.rowChart("#cell-row-chart");
	var nationChart = dc.rowChart("#nation-row-chart");
	var locationChart = dc.rowChart("#location-row-chart");



	total.formatNumber(d3.format("d"))
		.valueAccessor(function(d){return d*multiplier; })
		.group(all);


	timeChart
		.width(800)
		.height(140)
		.margins({top: 10, right: 50, bottom: 20, left: 20})
		//.dimension(dateDim)
		//.group(numRecordsByDate)
		.dimension(intervalDimension)
		.group(obsPerMinuteGroup)
		.transitionDuration(500)
		.x(d3.time.scale().domain([minDate, maxDate]))
		.elasticY(true)
		.yAxis().ticks(0);


    cellChart
    	.width(200)
		.height(500)
        .dimension(cellDim)
        .group(cellGroup)
        .ordering(function(d) { return -d.value })
        .colors(['#6baed6'])
        .elasticX(true)
        .labelOffsetY(10)
        .label(function(d){
            return d.key + " : "  +(d.value / ndx.groupAll().reduceCount().value() * 100).toFixed(2) + "%";
        })
        .xAxis().ticks(0);

    nationChart
		.width(200)
		.height(500)
        .dimension(nationDim)
        .group(nationGroup)
        .ordering(function(d) { return -d.value })
        .colors(['#6baed6'])
        .elasticX(true)
        .labelOffsetY(10)
        .label(function(d){
            return d.key + " : "  +(d.value / ndx.groupAll().reduceCount().value() * 100).toFixed(2) + "%";
        })
        .xAxis().ticks(0);

    locationChart
		.width(200)
		.height(500)
        .dimension(locationDim)
        .group(locationGroup)
        .ordering(function(d) { return -d.value })
        .colors(['#6baed6'])
        .elasticX(true)
        .labelOffsetY(10)
        .label(function(d){
            return d.key + " : "  +(d.value / ndx.groupAll().reduceCount().value() * 100).toFixed(2) + "%";
        })
     	.xAxis().ticks(0);

     timeChart.filterHandler(function(dim, filters) {
          if(filters && filters.length) {
              if(filters.length !== 1)
                  throw new Error('not expecting more than one range filter');
              var range = filters[0];
              dim.filterFunction(function(i) {
                  return !(i[1] < range[0].getTime() || i[0] > range[1].getTime());
              })
          }
          else dim.filterAll();
          return filters;
      });

    var map = L.map('map');
    map.setView([42.5, 1.5], 10);

	var drawMap = function(){

	    
		L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
    		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
    		subdomains: 'abcd',
    		maxZoom: 19
  			}).addTo(map);

		//HeatMap
		var geoData = [];
		_.each(allDim.top(Infinity), function (d) {
			geoData.push([d["Latitude"], d["Longitude"], 1]);
	      });
		var heat = L.heatLayer(geoData,{
			radius: 10, blur: 20, maxZoom: 1
		}).addTo(map);

	};

	//Draw Map
	drawMap();

	//Update the heatmap if any dc chart get filtered
	dcCharts = [timeChart, cellChart, nationChart, locationChart];

	_.each(dcCharts, function (dcChart) {
		dcChart.on("filtered", function (chart, filter) {
			map.eachLayer(function (layer) {
				map.removeLayer(layer)
			}); 
			drawMap();
		});
	});

	dc.renderAll();


};