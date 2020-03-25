// Constants
const timeFormat = 'MM/DD/YYYY';
const colors = [
    '#ffa41b',
    '#000839',
    '#005082',
    '#00a8cc'
];

const delay = 0;

// Variables
let chart = null;
let stateFilterSelected = "all";
let cachedData = new Map();

// Functions
function createMomentFromApiDate(apiDate) {
    if (apiDate instanceof moment) {
        return apiDate;
    }

    var str = apiDate + '';
    var date = moment({
        year: str.substring(0, 4),
        month: str.substring(4, 6) - 1,
        day: str.substring(6, 8)
    });

    date.endOf('day');
    return date;
}

// Pull new data from the server
async function refresh() {
    cachedData.clear();
    await applyStateFilter();
}

async function startRefresh() {
    // Signal to the user that we are refreshing
    $('#refreshButton').prop('disabled', true);
    $('#refreshButton').empty();
    $('#refreshButton').append('<span class="spinner-border mr-1" style="width: 1.5rem; height: 1.5rem;" role="status" aria-hidden="true"></span>Refresh');
    
    if (delay > 0) {
        await sleep(delay); // Used for debugging
    }
}

const sleep = (milliseconds) => {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function stopRefresh(refreshedAt) {
    // We're done! Show the last updated time and re-enable refresh button.
    var time = refreshedAt.format('h:mm:ss A');
    $('#refreshText').text(`Last refreshed at ${time}`);
    $('#refreshButton').empty();
    $('#refreshButton').append('<i class="fas fa-sync-alt mr-2"></i>Refresh');
    $('#refreshButton').prop('disabled', false);
}

function updateChart(data) {
    if (!chart) {
        chart = new Chart($('#myChart'), {
            type: "line",
            data: {
                labels: [],
                datasets: [
                    {
                        label: "Positive",
                        data: data.positive,
                        fill: false,
                        borderColor: colors[0],
                        lineTension: 0
                    },
                    {
                        label: "Negative",
                        data: data.negative,
                        fill: false,
                        borderColor: colors[3],
                        lineTension: 0
                    },
                    {
                        label: "Total",
                        data: data.total,
                        fill: false,
                        lineTension: 0
                    }
                ]
            },
            options: {
                scales: {
                    xAxes: [{
                        type: 'time',
                        time: {
                            parser: timeFormat,
                            unit: 'day'
                        },
                        scaleLabel: {
                            display: true,
                            labelString: 'Date'
                        },
                        ticks: {
                            source: 'data'
                        }
                    }],
                    yAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: 'Test Results'
                        },
                        ticks: {
                            beginAtZero: true,
                            userCallback: function(value, index, values) {
                                return value.toLocaleString();   // this is all we need
                            }
                        }
                    }]
                },
                tooltips: {
                    callbacks: {
                        label: function(tooltipItem, data) {
                            var label = data.datasets[tooltipItem.datasetIndex].label || '';
        
                            if (label) {
                                label += ': ';
                            }
                            label += tooltipItem.yLabel.toLocaleString();
                            return label;
                        }
                    }
                }
            }
        });
    } else {
        // The chart's already made, just update the data so it animates
        chart.data.datasets[0].data = data.positive;
        chart.data.datasets[1].data = data.negative;
        chart.data.datasets[2].data = data.total;
        chart.update();
    }
}

function updateCurrentText(data) {
    var positive = data.positive || 0;
    $('#positiveText').text(positive.toLocaleString());
    var negative = data.negative || 0;
    $('#negativeText').text(negative.toLocaleString());
    var posNeg = positive + negative;
    $('#totalText').text(posNeg.toLocaleString());
}

function updateStateFilter(states) {
    var filter = $('#stateFilter');
    filter.empty();

    states.unshift({
        state: 'all',
        name: 'All states'
    });

    for (var state of states) {
        let option = $(`<option value="${state.state}">${state.name}</option>`);
        if (option.val() === stateFilterSelected) {
            option.prop('selected', true);
        }
        $('#stateFilter').append(option);
    }
}

async function applyStateFilter() {
    var daily = null;
    var current = null;
    var states = null;
    var responses = null;
    var isRefreshing = false;
    
    // We need to look this data up
    if (!cachedData.has("state_" + stateFilterSelected)) {
        await startRefresh();
        isRefreshing = true;

        var isStateLevel = false;

        if (stateFilterSelected === "all") {
            responses = await Promise.all([
                $.getJSON('/api/us/daily'),
                $.getJSON('/api/us')
            ]);
        } else {
            isStateLevel = true;
            responses = await Promise.all([
                $.getJSON(`/api/states/daily?state=${stateFilterSelected}`),
                $.getJSON(`/api/states?state=${stateFilterSelected}`)
            ]);
        }

        if (!responses) {
            return;
        }

        cachedData.set("state_" + stateFilterSelected, {
            daily: responses[0],
            current: responses[1] ? (isStateLevel ? responses[1] : responses[1][0]) : null,
            refreshedAt: moment()
        });
    }

    var entry = cachedData.get("state_" + stateFilterSelected);
    daily = entry.daily.slice();
    current = entry.current;
    refreshedAt = entry.refreshedAt;

    // Same here
    if (!cachedData.has("states")) {
        if (!isRefreshing) {
            await startRefresh();
        }
        states = await $.getJSON('/api/states/info');
        cachedData.set("states", states);
    }
    
    states = cachedData.get("states").slice();

    // Populate graph
    if (daily) {
        var data = {
            positive: [],
            negative: [],
            total: []
        }

        // Add the current date and time to the graph
        // if (current) {
        //     daily.unshift({
        //         date: moment(),
        //         positive: current.positive,
        //         negative: current.negative
        //     });
        // }
    
        daily.forEach((dataPoint) => {
            if (dataPoint) {
                let date = createMomentFromApiDate(dataPoint.date);
                if (date) {
                    let dateStr = date.format(timeFormat);
                    let positive = dataPoint.positive || 0;
                    let negative = dataPoint.negative || 0;
                    data.positive.push({
                        t: dateStr,
                        y: positive
                    });
                    data.negative.push({
                        t: dateStr,
                        y: negative
                    });
                    var total = positive + negative;
                    data.total.push({
                        t: dateStr,
                        y: total
                    });
                }
            }
        });

        updateChart(data);
    }

    // Grab current stats - generally the same as the latest entry in daily but maybe not
    if (current) {
        updateCurrentText(current);
    }

    // Grab list of supported states - not hardcoded because not all territories are supported, and includes more than 50 states
    if (states) {
        updateStateFilter(states);
    }

    stopRefresh(refreshedAt);
}

// On document loaded
$(document).ready(async () => {
    $('#refreshButton').click(async () => refresh());
    $('#stateFilter').change(async (e) => {
        let newVal = $(e.target).val();
        if (newVal !== stateFilterSelected) {
            stateFilterSelected = newVal;
            await applyStateFilter();
        }
    });
    updateStateFilter([]); // Adds default
    await refresh();
})