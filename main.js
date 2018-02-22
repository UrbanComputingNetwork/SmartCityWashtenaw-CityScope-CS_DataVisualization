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
function drawCharts(error, pointData, compareData) {
        
    var records = pointData['data'],  compareRecords=compareData['data'];
    var multiplier= parseInt(pointData['multiplier']), compareMultiplier= parseInt(compareData['multiplier']);
    var dateFormat = d3.time.format("%Y%m%d %H:%M:%S");


    // create all the dimensions including a new starthour dimension
    
    records.forEach(function(d) {
      d["startTimestamp"] = dateFormat.parse(d["startTimestamp"]);
      d["endTimestamp"] = dateFormat.parse(d["endTimestamp"]);
      d["startTimestamp"].setSeconds(0);
      d["endTimestamp"].setSeconds(0);
      // d["startHour"].setSeconds(0);
      // d["startHour"].setMinutes(0);
      d['interval']=[d['startTimestamp'].getTime(), d['endTimestamp'].getTime()];
      d['weight']=1;
    });

    console.log(records[records.length/2]['startTimestamp'])
    var dayOfInterest=records[records.length/2]['startTimestamp'].getDate();
    console.log(dayOfInterest)

    var ndx = crossfilter(records);

    if (multiplier!=compareMultiplier){
      console.log('More than one date selected')
      compareRecords.forEach(function(d) {
      d["startTimestamp"] = dateFormat.parse(d["startTimestamp"]);
      d["endTimestamp"] = dateFormat.parse(d["endTimestamp"]);
      d["startTimestamp"].setSeconds(0);
      d["startTimestamp"].setDate(dayOfInterest);
      d["endTimestamp"].setSeconds(0);
      d["endTimestamp"].setDate(dayOfInterest);
      // d["startHour"].setSeconds(0);
      // d["startHour"].setMinutes(0);
      d['interval']=[d['startTimestamp'].getTime(), d['endTimestamp'].getTime()];
      d['weight']=-1;
    });
      ndx.add(compareRecords);
    }

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


    var cellDim = ndx.dimension(function(d) { return d["Cell"]; });
    var nationDim = ndx.dimension(function(d) { return d["Nation"]; });
    var locationDim = ndx.dimension(function(d) { return d["Location"]; });
    var allDim = ndx.dimension(function(d) {return d;});
    var weightDim = ndx.dimension(function(d) {return d["weight"];});

    var cellGroup = cellDim.group();
    var nationGroup = nationDim.group();
    var locationGroup = locationDim.group();
    var obsPerMinuteGroup = intervalTreeGroup(obsPerMinuteTree.value(), minDate, maxDate)
    var weightGroup = weightDim.group();
    var all = ndx.groupAll();



    // if (multiplier!=compareMultiplier){
    //   console.log('More than one date selected')

      // This is a hack whereby if None is selected, the primary day data is passed to drawCharts twice- 
      // as both the primary and compare day data. Assuming no 2 days will have the same multiplier.
      // This needs to be fixed later
    //   compareRecords.forEach(function(d) {
    //   d["startTimestamp"] = dateFormat.parse(d["startTimestamp"]);
    //   d["endTimestamp"] = dateFormat.parse(d["endTimestamp"]);
    //   d["startTimestamp"].setSeconds(0);
    //   d["endTimestamp"].setSeconds(0);
    //   // d["startHour"].setSeconds(0);
    //   // d["startHour"].setMinutes(0);
    //   d['interval']=[d['startTimestamp'].getTime(), d['endTimestamp'].getTime()];
    // });

    //   var ndxC = crossfilter(compareRecords);
    //   console.log(ndxC.groupAll().value())

    //   var intervalDimensionC = ndxC.dimension(function(d) {return d.interval;})
    //   var obsPerMinuteTreeC = ndxC.groupAll().reduce(
    //               function(v, d) {
    //                   v.insert(d.interval);
    //                   return v;
    //               },
    //               function(v, d) {
    //                   v.remove(d.interval);
    //                   return v;
    //               },
    //               function() {
    //                   return lysenkoIntervalTree(null);
    //               }
    //           )

    //   var cellDimC = ndxC.dimension(function(d) { return d["Cell"]; });
    //   var nationDimC = ndxC.dimension(function(d) { return d["Nation"]; });
    //   var locationDimC = ndxC.dimension(function(d) { return d["Location"]; });
    //   var allDimC = ndxC.dimension(function(d) {return d;});

    //   var cellGroupC = cellDimC.group();
    //   var nationGroupC = nationDimC.group();
    //   var locationGroupC = locationDimC.group();
    //   var obsPerMinuteGroupC = intervalTreeGroup(obsPerMinuteTreeC.value(), minDate, maxDate)
    //   var allC = ndxC.groupAll();

        
     // }


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

      

    var drawMap = function(){
      map.eachLayer(function (layer) {
          map.removeLayer(layer)
        });

        
      L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
          subdomains: 'abcd',
          maxZoom: 19
          }).addTo(map);

      //HeatMap
      var geoData = [];
      var geoDataNeg=[];
      _.each(allDim.top(Infinity), function (d) {
        geoData.push([d["Latitude"], d["Longitude"], 0.5*d['weight']]);
        geoDataNeg.push([d["Latitude"], d["Longitude"], -0.5*d['weight']]);
          });
      
      var heatNeg = L.heatLayer(geoDataNeg,{
        maxZoom:1, max:2, radius: 10, blur: 20, gradient:{0: 'green', 1: 'blue'}
      }).addTo(map);
      var heat = L.heatLayer(geoData,{
        maxZoom:1, max:2, radius: 10, blur: 20, gradient:{0: 'green', 0.5: 'yellow', 1: 'red'}
      }).addTo(map);

    };

    //Draw Map
    drawMap();
    weightDim.filter(1)

    //Update the heatmap if any dc chart get filtered
    dcCharts = [timeChart, cellChart, nationChart, locationChart];

    // timeChart.on("filtered", function(chart){
    //   intervalDimensionC.filter(chart.filters())
    //   console.log(ndxC.groupAll().value())
    //   drawMap();
    // }
    // );

    // nationChart.on("filtered", function(chart){
    //   nationDimC.filter(chart.filters())
    //   console.log(ndxC.groupAll().value())
    //   drawMap();
    // }
    // );

    // cellChart.on("filtered", function(chart){
    //   cellDimC.filter(chart.filters())
    //   console.log(ndxC.groupAll().value())
    //   drawMap();
    // }
    // );

    // locationChart.on("filtered", function(chart){
    //   locationDimC.filter(chart.filters())
    //   console.log(ndxC.groupAll().value())
    //   drawMap();
    // }
    // );

    _.each(dcCharts, function (dcChart) {
      dcChart.on("filtered", function (chart, filter) {
        
        weightDim.filterAll()
        drawMap();
        weightDim.filter(1)
      });
    });

    dc.renderAll();


  };
var inputPath ="./input/Andorra/";
var $inputDate = $("select[name='dateDD']")
var $inputCompare = $("select[name='compareDD']")
var dateOptions=["20160718", "20160719", "20160720", "20160721", "20160722", "20160723", "20160724"]

$(dateOptions).each(function(i, v){ 
    $inputDate.append($("<option>", { value: v, html: v }));
    $inputCompare.append($("<option>", { value: v, html: v }));
});

// $inputDate.append($("<option>", { value: "opt", html: "opt" }));
document.getElementById("dateDD").onchange = function() {reDraw()};
document.getElementById("compareDD").onchange = function() {reDraw()};

var radSlider = document.getElementById("radRange");
var radOutput = document.getElementById("radVal");
radOutput.innerHTML = radSlider.value;


var blurSlider = document.getElementById("blurRange");
var blurOutput = document.getElementById("blurVal");
blurOutput.innerHTML = blurSlider.value;




var map = L.map('map');
map.setView([42.5, 1.5], 11);

function reDraw(){
  console.log('Redrawing')
  var primaryDate=document.getElementById("dateDD").options[document.getElementById("dateDD").selectedIndex].value;
  var compareDate=document.getElementById("compareDD").options[document.getElementById("compareDD").selectedIndex].value;

  drawOdMap(primaryDate)

  if (compareDate=='None'){
    queue()
    .defer(d3.json, inputPath+primaryDate+'/stayData.json')
    .defer(d3.json, inputPath+primaryDate+'/stayData.json')
    .await(drawCharts);
  }
  else{
  queue()
      // .defer(d3.json, "./input/Andorra/stayData.json")
      .defer(d3.json, inputPath+primaryDate+'/stayData.json')
      .defer(d3.json, inputPath+compareDate+'/stayData.json')
      .await(drawCharts);
    }
  

}
reDraw();
