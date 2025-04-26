import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { ChartData } from "../types/api";
import moment from "moment";
import { ChartConfiguration, ChartTypeRegistry } from "chart.js";

const width = 800;
const height = 400;

// Create an instance of ChartJSNodeCanvas
const chartJSNodeCanvas = new ChartJSNodeCanvas({
	width,
	height,
	backgroundColour: "white",
});

export const ChartService = {
	/**
	 * Generate a line chart from data
	 */
	async generateLineChart(
		chartData: ChartData,
		title: string,
	): Promise<Buffer> {
		const configuration: ChartConfiguration<"line"> = {
			type: "line",
			data: chartData,
			options: {
				plugins: {
					title: {
						display: true,
						text: title,
						font: {
							size: 16,
						},
					},
					legend: {
						display: true,
						position: "bottom" as const,
					},
				},
				scales: {
					y: {
						beginAtZero: false,
						grid: {
							display: true,
						},
					},
					x: {
						grid: {
							display: false,
						},
					},
				},
				elements: {
					line: {
						tension: 0.2,
					},
					point: {
						radius: 3,
					},
				},
			},
		};

		// Generate chart as buffer
		return await chartJSNodeCanvas.renderToBuffer(configuration);
	},

	/**
	 * Generate a bar chart from data
	 */
	async generateBarChart(chartData: ChartData, title: string): Promise<Buffer> {
		const configuration: ChartConfiguration<"bar"> = {
			type: "bar",
			data: chartData,
			options: {
				plugins: {
					title: {
						display: true,
						text: title,
						font: {
							size: 16,
						},
					},
					legend: {
						display: true,
						position: "bottom" as const,
					},
				},
				scales: {
					y: {
						beginAtZero: true,
						grid: {
							display: true,
						},
					},
					x: {
						grid: {
							display: false,
						},
					},
				},
			},
		};

		// Generate chart as buffer
		return await chartJSNodeCanvas.renderToBuffer(configuration);
	},

	/**
	 * Generate a pie chart for token distribution
	 */
	async generatePieChart(chartData: ChartData, title: string): Promise<Buffer> {
		const configuration: ChartConfiguration<"pie"> = {
			type: "pie",
			data: chartData,
			options: {
				plugins: {
					title: {
						display: true,
						text: title,
						font: {
							size: 16,
						},
					},
					legend: {
						display: true,
						position: "bottom" as const,
					},
				},
			},
		};

		// Generate chart as buffer
		return await chartJSNodeCanvas.renderToBuffer(configuration);
	},

	/**
	 * Format time series data for charts
	 */
	formatTimeSeriesData(
		data: any[],
		valueKey: string,
		timeKey: string = "time",
		label: string = "Value",
	): ChartData {
		const labels = data.map((item) =>
			moment(item[timeKey] * 1000).format("MMM DD"),
		);
		const values = data.map((item) => item[valueKey]);

		return {
			labels,
			datasets: [
				{
					label,
					data: values,
					borderColor: "rgb(75, 192, 192)",
					backgroundColor: "rgba(75, 192, 192, 0.2)",
				},
			],
		};
	},

	/**
	 * Format comparison data for bar charts
	 */
	formatComparisonData(
		labels: string[],
		values: number[],
		label: string = "Value",
	): ChartData {
		return {
			labels,
			datasets: [
				{
					label,
					data: values,
					backgroundColor: "rgba(54, 162, 235, 0.5)",
				},
			],
		};
	},

	/**
	 * Format token price history for charts
	 */
	formatTokenPriceHistory(priceData: any[]): ChartData {
		const labels = priceData.map((item) =>
			moment(item.time * 1000).format("MMM DD"),
		);
		const prices = priceData.map((item) => item.close);

		return {
			labels,
			datasets: [
				{
					label: "Price",
					data: prices,
					borderColor: "rgb(75, 192, 192)",
					backgroundColor: "rgba(75, 192, 192, 0.2)",
				},
			],
		};
	},
};
