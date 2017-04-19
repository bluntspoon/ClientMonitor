var options = {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
};
var myname = "UKMon";
var postURL = "http://clientdash.azurewebsites.net";

var historyMinutes = 30;
var chartKeys = {
    "Router": 1,
    "Lobby": 2
};
var latencyTests = {};
var chart;

$(document).ready(function () {
    setupRouterMonitor();
    setupLobbyMonitor();
    setupLogging();
    startCharts();
});

function setupRouterMonitor() {
    var url = "https://mppgs1mobile.valueactive.eu/pokerBabelFish";
    setupMonitor("Router", "router", url);
}

function setupLobbyMonitor() {
    var url = "https://mpplobby3mobile.valueactive.eu/pokerBabelFish";
    setupMonitor("Lobby", "lobby", url);
}

function setupMonitor(name, targetDivName, url) {
    var timeoutMilliSec = 35 * 1000;
    var connection = $.connection(url);
    connection.logging = true;
    connection.start();
    $("#" + targetDivName + "UpdateTime").text("Starting...");
    $("#" + targetDivName + "Url").text(url);
    var timer = setTimeout(function () { $("#lobby").removeClass("up"); }, timeoutMilliSec);

    connection.received(function (data) {
        clearTimeout(timer);
        var timestamp = new Date().toLocaleString('en-ZA', options);
        $("#" + targetDivName + "UpdateTime").text(timestamp);
        $("#" + targetDivName).removeClass("down");
        $("#" + targetDivName).addClass("up");
        console.log(name + " Message: " + data);
        timer = setTimeout(function () { $("#" + targetDivName).removeClass("up"); }, timeoutMilliSec);
    });

    connection.disconnected(function () {
        logConnectionChange(name, "false");
        setTimeout(function () {
            connection.start();
        }, 5000); // Restart connection after 5 seconds.
    });

    connection.error(function (error) {
        $("#" + targetDivName).removeClass("up");
        $("#" + targetDivName).addClass("down");
        $("#" + targetDivName + "UpdateTime").text("ERROR");
        console.log(name + " SignalR Error: " + error)
    });

    connection.stateChanged(function (change) {
        if (change.newState === $.signalR.connectionState.connected) {
            logConnectionChange(name, "true");
            testLatency(connection, name);
        }
    });

}

function setupLogging() {
    setInterval(function () {
        $("#log").animate({ scrollTop: $('#log').prop("scrollHeight") }, 1000);
    }, 60000);

    if (typeof console != "undefined")
        if (typeof console.log != 'undefined')
            console.olog = console.log;
        else
            console.olog = function () { };

    console.log = function (message) {
        console.olog(message);
        var timestamp = new Date().toLocaleString('en-ZA', options);
        $('#log').append('<b>' + timestamp + ' => </b>' + '<div>' + message + '</div>');
        cleanupLog();
    };
    console.error = console.debug = console.info = console.log
}

function cleanupLog() {
    var Bs = $('#log').children("b"),
        DIVs = $('#log').children("div"),
        maxLength = 200;
    if (Bs.length > maxLength) {
        for (var i = 0; i < Bs.length - maxLength; i += 1) {
            Bs[0].remove();
        }
    }
    if (DIVs.length > maxLength) {
        for (var i = 0; i < DIVs.length - maxLength; i += 1) {
            DIVs[0].remove();
        }
    }
}

function testLatency(connection, name) {
    var startTime = new Date().getTime();
    latencyTests[name] = {
        startTime: startTime,
        endTime: 0
    }
    $.connection.transports._logic.pingServer(connection, "")
        .done(function () {
            latencyResult(name);
        })
        .fail(function () {
            latencyFail(name);
        });
    var timer = setTimeout(function () {
        testLatency(connection, name);
    }, 60000);
    connection.stateChanged(function (change) {
        if (change.newState !== $.signalR.connectionState.connected) {
            clearTimeout(timer);
        }
    });
}

function latencyResult(name) {
    var endTime = new Date().getTime();
    latencyTests[name].endTime = endTime;
    var latency = (latencyTests[name].endTime - latencyTests[name].startTime) / 2;
    logLatency(name, latency);
    chartAddLatency(name, latency);
}

function latencyFail(name) {
    var endTime = new Date().getTime();
    latencyTests[name].endTime = endTime;
    var latency = 0;
    chartAddLatency(name, latency)
    console.log("Latency test failed: " + name);
}

function chartAddLatency(name, latency) {
    var idx = chartKeys[name];
    var len = tableData.length - 1;
    for (var i = 1; i < len; i++) {
        tableData[i][idx] = tableData[i + 1][idx];
    }
    tableData[len][idx] = latency;
    drawChart();
}

function startCharts() {
    google.charts.load('current', { 'packages': ['corechart'] });
    google.charts.setOnLoadCallback(createChart);
}

function createChart() {
    chart = new google.visualization.LineChart(document.getElementById('curve_chart'));
}

function drawChart() {
    // Create the data table.
    var data = google.visualization.arrayToDataTable(tableData);

    var options = {
        title: 'Latency',
        curveType: 'function',
        legend: { position: 'bottom' }
    };
    chart.draw(data, options);
}

function logLatency(name, latency) {
    $.post(postURL, {
        servername: myname,
        connectionname: name,
        latency: latency
    });
}

function logConnectionChange(name, value) {
    $.post(postURL + "/connectionState", {
        servername: myname,
        connectionname: name,
        connectionstate: value
    });
}

var tableData = [
    ["Item", "Router", "Lobby", "Threshold"]
];
for (var i = 1; i < historyMinutes; i++) {
    tableData.push([i.toString(), 0, 0, 200]);
}
