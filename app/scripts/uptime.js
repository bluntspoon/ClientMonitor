var options = {
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
};
var postURL = "http://clientdash.azurewebsites.net";

var latencyTests = {};

function domReady(callback) {
    document.readyState === "interactive" || document.readyState === "complete" ? callback() : document.addEventListener("DOMContentLoaded", callback);
};

domReady(function () {
    console.log("Starting");
    loadScript("http://ajax.aspnetcdn.com/ajax/signalr/jquery.signalr-2.2.1.min.js", setupConnections);
});

function setupConnections() {
    console.log("setupConnections");
    setupRouterMonitor();
    setupLobbyMonitor();
}

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
        setTimeout(function () {
            connection.start();
        }, 5000); // Restart connection after 5 seconds.
    });

    connection.error(function () {
        setTimeout(function () {
            connection.start();
        }, 5000); // Restart connection after 5 seconds.
    });

    connection.stateChanged(function (change) {
        if (change.newState === $.signalR.connectionState.connected) {
            logConnectionChange(name, "true");
            testLatency(connection, name);
        }
        else {
            logConnectionChange(name, "false");
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
        var startTime = Date.now();
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
    var endTime = Date.now();
    latencyTests[name].endTime = endTime;
    if (latencyTests[name].endTime > latencyTests[name].startTime) {
        var latency = (latencyTests[name].endTime - latencyTests[name].startTime) / 2;
        logLatency(name, latency);
    }
}

function latencyFail(name) {
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

function loadScript(url, callback) {

    var script = document.createElement("script")
    script.type = "text/javascript";

    if (script.readyState) {  //IE
        script.onreadystatechange = function () {
            if (script.readyState == "loaded" ||
                script.readyState == "complete") {
                script.onreadystatechange = null;
                callback();
            }
        };
    } else {  //Others
        script.onload = function () {
            callback();
        };
    }

    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
}