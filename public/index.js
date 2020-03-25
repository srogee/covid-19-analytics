let chart = null;

const timeFormat = 'MM/DD/YYYY';

function dateFromApi(number) {
    var str = number + '';
    return new Date(str.substring(0, 4), str.substring(4, 6) - 1, str.substring(6, 8));
}

function refresh(fromUser) {
    $('#refreshButton').prop('disabled', true);
    $.getJSON('/api/cachedStats', (response) => {
        let positive = [];
        let negative = [];

        response.forEach((dataPoint) => {
            dataPoint.date = dateFromApi(dataPoint.date);
        })
        response.sort((a, b) => a.date.valueOf() - b.date.valueOf());

        response.forEach((dataPoint) => {
            if (dataPoint) {
                var date = moment(dataPoint.date).format(timeFormat);
                positive.push({
                    t: date,
                    y: dataPoint.positive
                });
                negative.push({
                    t: date,
                    y: dataPoint.negative
                });
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
                            borderColor: "rgb(255, 50, 50)",
                        },
                        {
                            label: "Negative",
                            data: negative,
                            fill: false,
                            borderColor: "rgb(50, 50, 255)",
                        }
                    ]
                },
                options: {
                    title: {
                        display: true,
                        text: 'Coronavirus Tests in the U.S.'
                    },
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
            chart.data.datasets[0].data = positive;
            chart.data.datasets[1].data = negative;
            chart.update();
        }
        
        var time = moment().format('h:mm:ss A');
        $('#refreshButton').text(fromUser ? `Refresh (${time})` : 'Refresh');
        $('#refreshButton').prop('disabled', false);
    });
}

refresh(false);

$(document).ready(() => {
    $('#refreshButton').click(() => refresh(true));
})