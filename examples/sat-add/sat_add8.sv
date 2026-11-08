module sat_add8 (
  input  logic       clk_i,
  input  logic       rst_ni,
  input  logic       in_valid_i,
  output logic       in_ready_o,
  input  logic [7:0] a_i,
  input  logic [7:0] b_i,
  output logic       out_valid_o,
  input  logic       out_ready_i,
  output logic [7:0] sum_o
);
  logic [8:0] sum_ext;
  logic [7:0] sat_sum;
  assign sum_ext = {1'b0, a_i} + {1'b0, b_i};
  assign sat_sum = sum_ext[8] ? 8'hff : sum_ext[7:0];
  assign in_ready_o = !out_valid_o || out_ready_i;

  always_ff @(posedge clk_i or negedge rst_ni) begin
    if (!rst_ni) begin
      out_valid_o <= 1'b0;
      sum_o <= '0;
    end else if (in_ready_o) begin
      out_valid_o <= in_valid_i;
      if (in_valid_i) sum_o <= sat_sum;
    end
  end
endmodule
