package fixture

import "testing"

func TestSum(t *testing.T) {
	for _, test := range []struct {
		name   string
		values []int
		want   int
	}{
		{"empty", nil, 0},
		{"positive", []int{1, 2, 3}, 6},
		{"negative", []int{-2, 5}, 3},
	} {
		t.Run(test.name, func(t *testing.T) {
			if got := Sum(test.values); got != test.want {
				t.Fatalf("got %d; want %d", got, test.want)
			}
		})
	}
}
