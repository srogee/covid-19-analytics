// Constants
const timeFormat = 'MM/DD/YYYY';
const colors = [
    '#ffa41b',
    '#000839',
    '#005082',
    '#00a8cc'
];

// Variables
let chart = null;

// Functions
function dateFromApi(number) {
    var str = number + '';
    return new Date(str.substring(0, 4), str.substring(4, 6) - 1, str.substring(6, 8));
}

// Pull new data from the server
async function refresh(fromUser) {
    // Signal to the user that we are refreshing
    $('#refreshButton').prop('disabled', true);

    let responses = await Promise.all([$.getJSON('/api/us/daily'), $.getJSON('/api/us')]);

    // Populate graph
    if (responses[0]) {
        let positive = [];
        let negative = [];
        let total = [];
    
        responses[0].forEach((dataPoint) => {
            if (dataPoint) {
                let date = dateFromApi(dataPoint.date);
                if (date) {
                    let dateStr = moment(date).format(timeFormat);
                    positive.push({
                        t: dateStr,
                        y: dataPoint.positive
                    });
                    negative.push({
                        t: dateStr,
                        y: dataPoint.negative
                    });
                    total.push({
                        t: dateStr,
                        y: dataPoint.posNeg
                    });
                }
            }
        });
    
        if (!chart) {
            chart = new Chart($('#myChart'), {
                type: "line",
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: "Positive",
                            data: positive,
                            fill: false,
                            borderColor: colors[0],
                        },
                        {
                            label: "Negative",
                            data: negative,
                            fill: false,
                            borderColor: colors[3],
                        },
                        {
                            label: "Total",
                            data: total,
                            fill: false
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
            chart.data.datasets[0].data = positive;
            chart.data.datasets[1].data = negative;
            chart.update();
        }
    }

    // Grab current stats - generally the same as the latest entry in daily but maybe not
    var firstEntry = responses[1] ? responses[1][0] : null;
    if (firstEntry) {
        $('#positiveText').text(firstEntry.positive.toLocaleString());
        $('#negativeText').text(firstEntry.negative.toLocaleString());
        $('#totalText').text(firstEntry.posNeg.toLocaleString());
    }
        
    // We're done! Show the last updated time and re-enable refresh button.
    var time = moment().format('h:mm:ss A');
    $('#refreshText').text(fromUser ? `Last refreshed at ${time}` : '');
    $('#refreshButton').prop('disabled', false);
}

// On document loaded
$(document).ready(async () => {
    $('#refreshButton').click(async () => refresh(true));
    await refresh(false);
})