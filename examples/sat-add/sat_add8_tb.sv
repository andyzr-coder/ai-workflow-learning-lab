`timescale 1ns/1ps
module sat_add8_tb;
  logic clk = 1'b0;
  logic rst_n = 1'b0;
  logic in_valid = 1'b0;
  logic in_ready;
  logic [7:0] a = '0;
  logic [7:0] b = '0;
  logic out_valid;
  logic out_ready = 1'b0;
  logic [7:0] result;
  bit expected_valid = 1'b0;
  int expected_value = 0;
  int checked = 0;
  int accepted = 0;
  int consumed = 0;
  int unsigned rng = 32'hd47a391b;
  sat_add8 dut (.clk_i(clk), .rst_ni(rst_n), .in_valid_i(in_valid),
    .in_ready_o(in_ready), .a_i(a), .b_i(b), .out_valid_o(out_valid),
    .out_ready_i(out_ready), .sum_o(result));
  always #5 clk = ~clk;

  // Integer mathematics is independent of the RTL carry-bit implementation.
  function automatic int reference_sum(input int aa, input int bb);
    int raw;
    raw = aa + bb;
    return raw > 255 ? 255 : raw;
  endfunction
  function automatic int unsigned next_random();
    rng = rng ^ (rng << 13);
    rng = rng ^ (rng >> 17);
    rng = rng ^ (rng << 5);
    return rng;
  endfunction
  task automatic step(input bit reset_n, input bit valid, input bit ready,
                      input logic [7:0] aa, input logic [7:0] bb);
    bit take;
    @(negedge clk);
    rst_n = reset_n;
    in_valid = valid;
    out_ready = ready;
    a = aa;
    b = bb;
    @(posedge clk);
    if (reset_n && out_valid && ready) begin
      if (!expected_valid || int'(result) != expected_value)
        $fatal(1, "FAIL output transaction: got %0d expected %0d", result, expected_value);
      consumed++;
    end
    take = !expected_valid || ready;
    if (!reset_n) begin
      expected_valid = 1'b0;
      expected_value = 0;
    end else if (take) begin
      expected_valid = valid;
      if (valid) begin
        expected_value = reference_sum(int'(aa), int'(bb));
        accepted++;
      end
    end
    #1;
    if (out_valid !== expected_valid)
      $fatal(1, "FAIL valid: got %0b expected %0b", out_valid, expected_valid);
    if (int'(result) != expected_value)
      $fatal(1, "FAIL data/hold/reset: got %0d expected %0d at %0t", result, expected_value, $time);
    if (in_ready !== (!out_valid || ready)) $fatal(1, "FAIL ready");
    checked++;
  endtask
  initial begin
    $dumpfile("sat-add.vcd");
    $dumpvars(0, sat_add8_tb);
    step(0, 0, 0, 0, 0);
    step(1, 1, 1, 8'd255, 8'd1);
    step(1, 0, 1, 0, 0);
    $dumpoff;
    for (int aa = 0; aa < 256; aa++) begin
      for (int bb = 0; bb < 256; bb++) step(1, 1, 1, 8'(aa), 8'(bb));
    end
    step(1, 0, 1, 0, 0);
    if (accepted != consumed) $fatal(1, "FAIL full enumeration lost transaction");
    $display("PASS exhaustive: 65536 input pairs, accepted=%0d consumed=%0d", accepted, consumed);
    $dumpon;
    for (int i = 0; i < 400; i++) begin
      step(i % 97 != 0, (next_random() % 4) != 0, (next_random() % 3) != 0,
           8'(next_random()), 8'(next_random()));
    end
    step(1, 0, 1, 0, 0);
    step(0, 0, 0, 0, 0);
    $display("PASS handshake/backpressure/reset: 400 deterministic cycles");
    $display("PASS total checks=%0d", checked);
    $finish;
  end
  initial begin
    #1000000;
    $fatal(1, "FAIL simulation timeout");
  end
endmodule
