package ma.attijariwafa.desk_international;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DeskInternationalApplication {

	public static void main(String[] args) {
		SpringApplication.run(DeskInternationalApplication.class, args);
	}

}
