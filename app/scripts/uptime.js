var options = {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
};
var postURL = "http://clientdash.azurewebsites.net";

var latencyTests = {};

$(document).ready(function () {
    setupRouterMonitor();
    setupLobbyMonitor();
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
    var connection = $.connection(url);
    connection.logging = true;

    connection.disconnected(function () {
        logConnectionChange(name, "false");
        setTimeout(function () {
            connection.start();
        }, 5000); // Restart connection after 5 seconds.
    });

    connection.error(function (error) {
        logConnectionChange(name, "false");
        setTimeout(function () {
            connection.start();
        }, 5000);
    });

    connection.stateChanged(function (change) {
        if (change.newState === $.signalR.connectionState.connected) {
            logConnectionChange(name, "true");
            testLatency(connection, name);
        }
    });
    connection.start();
}

function isConnected(connection) {

}

function testLatency(connection, name) {
    if (latencyTests[name] && latencyTests[name][startTime] > 0) {
    }
    else {
        var startTime = new Date().getTime();
        latencyTests[name] = {
            startTime: startTime,
            endTime: 0
        }
        $.connection.transports._logic.pingServer(connection, "")
            .done(function () {
                latencyResult(name);
                latencyTests[name][startTime] = 0;
            })
            .fail(function () {
                latencyFail(name);
                latencyTests[name][startTime] = 0;
            });
        var timer = setTimeout(function () {
            testLatency(connection, name);
        }, 55000);
        connection.stateChanged(function (change) {
            if (change.newState !== $.signalR.connectionState.connected) {
                latencyTests[name][startTime] = 0;
                clearTimeout(timer);
            }
        });
    }
}

function latencyResult(name) {
    var endTime = new Date().getTime();
    latencyTests[name].endTime = endTime;
    var latency = (latencyTests[name].endTime - latencyTests[name].startTime) / 2;
    logLatency(name, latency);
}

function latencyFail(name) {
    var endTime = new Date().getTime();
    latencyTests[name].endTime = endTime;
    var latency = 0;
    logLatency(name, latency);
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